"""StreamVault — a Telegram-backed CDN / OTT-style web app.

Run:  python main.py          (needs env vars, see .env.example)
"""

import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pyrogram import Client, filters
from pyrogram.errors import FileReferenceExpired
from pyrogram.file_id import FileId

from config import Config
from database import Database
from streamer import TelegramStreamer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(name)s | %(message)s",
)
log = logging.getLogger("tgcdn")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
db = Database(os.path.join(BASE_DIR, "files.db"))

bot: Client = None
streamer: TelegramStreamer = None

MEDIA_FILTER = (
    filters.video | filters.document | filters.audio | filters.photo | filters.voice
)


# --------------------------------------------------------------------- #
#  Helpers                                                               #
# --------------------------------------------------------------------- #

def extract_media(message) -> dict | None:
    """Pull a catalog record out of a Pyrogram message."""
    media = (
        message.video or message.document or message.audio
        or message.voice or message.photo
    )
    if media is None:
        return None

    thumb = None
    if getattr(media, "thumbs", None):
        biggest = max(media.thumbs, key=lambda t: t.width or 0)
        thumb = biggest.file_id

    file_name = (
        getattr(media, "file_name", None)
        or (f"photo_{media.date.strftime('%Y%m%d_%H%M%S')}" if message.photo else "file")
    )
    mime = getattr(media, "mime_type", None) or (
        "image/jpeg" if message.photo else "application/octet-stream"
    )

    return {
        "file_id": media.file_id,
        "file_name": file_name,
        "file_size": media.file_size or 0,
        "mime_type": mime,
        "duration": getattr(media, "duration", 0) or 0,
        "width": getattr(media, "width", 0) or 0,
        "height": getattr(media, "height", 0) or 0,
        "thumb_file_id": thumb,
        "chat_id": message.chat.id if message.chat else None,
        "message_id": message.id,
        "caption": (message.caption or "")[:500],
    }


async def index_message(message) -> str | None:
    """Add a message's media to the catalog (deduped per chat+message)."""
    rec = extract_media(message)
    if rec is None:
        return None
    if rec["chat_id"] and rec["message_id"]:
        existing = db.find_by_message(rec["chat_id"], rec["message_id"])
        if existing:
            db.update_file_id(existing["uuid"], rec["file_id"], rec["thumb_file_id"])
            return existing["uuid"]
    return db.add(**rec)


async def refresh_file_id(row) -> str:
    """File references expire — re-fetch the original message for a fresh one."""
    if bot is None or not row["chat_id"] or not row["message_id"]:
        raise HTTPException(503, "File reference expired and cannot be refreshed")
    m = await bot.get_messages(row["chat_id"], row["message_id"])
    rec = extract_media(m)
    if rec is None:
        raise HTTPException(410, "Original message no longer has media")
    db.update_file_id(row["uuid"], rec["file_id"], rec["thumb_file_id"])
    return rec["file_id"]


async def ensure_metadata(row, force=False):
    """If mime/size are unknown (manual file_id adds), probe Telegram for them.
    Without this the watch page can't show a video player or allow seeking."""
    if row is None or streamer is None:
        return row
    if not force and row["mime_type"] and row["file_size"]:
        return row
    try:
        size, mime = await asyncio.wait_for(
            streamer.probe_file(row["file_id"]), timeout=30
        )
        db.update_meta(row["uuid"], mime, size)
        return db.get(row["uuid"])
    except Exception as e:
        log.warning("Probe failed for %s: %s", row["uuid"], e)
        return row


def parse_range(header: str, size: int):
    """Parse a Range header, returns (start, end) inclusive or None."""
    try:
        unit, spec = header.split("=", 1)
        spec = spec.strip()
        if unit.strip().lower() != "bytes" or "," in spec:
            return None
        if spec.startswith("-"):                      # suffix: last N bytes
            n = int(spec[1:])
            if n <= 0:
                return "invalid"
            return (max(0, size - n), size - 1)
        s, _, e = spec.partition("-")
        start = int(s)
        end = int(e) if e else size - 1
        if start < 0 or end < start:
            return "invalid"
        return (start, min(end, size - 1))
    except (ValueError, AttributeError):
        return "invalid"


def file_response_headers(row, start, end, status) -> dict:
    size = row["file_size"]
    headers = {
        "Accept-Ranges": "bytes",
        "Content-Type": row["mime_type"] or "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
    }
    if size:
        headers["Content-Length"] = str(end - start + 1)
    if status == 206:
        headers["Content-Range"] = f"bytes {start}-{end}/{size}"
    return headers


async def stream_response(row, request: Request, as_attachment=False):
    global streamer
    if streamer is None:
        raise HTTPException(503, "Telegram client is not running — check credentials")

    size = row["file_size"] or 0
    start, end, status = 0, (size - 1 if size else None), 200

    if range_header := request.headers.get("range"):
        parsed = parse_range(range_header, size)
        if parsed == "invalid" or (parsed and not size):
            return Response(
                status_code=416,
                headers={"Content-Range": f"bytes */{size}"} if size else {},
            )
        if parsed:
            start, end = parsed
            status = 206

    if as_attachment:
        fname = (row["file_name"] or row["uuid"]).replace('"', "")
        disp = f'attachment; filename="{fname}"; filename*=UTF-8\'\'{fname}'
    else:
        disp = "inline"

    async def content():
        fid = row["file_id"]
        for attempt in range(2):
            try:
                async for chunk in streamer.iter_file(fid, start, end):
                    yield chunk
                return
            except FileReferenceExpired:
                if attempt or (not row["chat_id"] or not row["message_id"]):
                    raise HTTPException(410, "File reference expired")
                log.info("Refreshing expired file reference for %s", row["uuid"])
                fid = await refresh_file_id(row)

    return StreamingResponse(
        content(),
        status_code=status,
        headers={**file_response_headers(row, start, end, status),
                 "Content-Disposition": disp},
    )


def row_to_json(row) -> dict:
    return {
        "uuid": row["uuid"],
        "name": row["file_name"] or row["uuid"],
        "size": row["file_size"],
        "mime": row["mime_type"],
        "duration": row["duration"],
        "has_thumb": bool(row["thumb_file_id"]),
        "caption": row["caption"],
        "created_at": row["created_at"],
    }


# --------------------------------------------------------------------- #
#  Bot                                                                   #
# --------------------------------------------------------------------- #

def register_bot(client: Client):
    @client.on_message(filters.command("start") & filters.private)
    async def start_cmd(c, m):
        await m.reply(
            f"👋 Send me any file, video, song or photo and I'll give you "
            f"streaming + download links for the web app.\n\n"
            f"🌐 Web app: {Config.BASE_URL}"
        )

    @client.on_message(filters.private & MEDIA_FILTER)
    async def on_private_file(c, m):
        uuid = await index_message(m)
        if uuid:
            await m.reply(
                f"✅ Indexed!\n\n"
                f"▶️ Watch: {Config.BASE_URL}/#/watch/{uuid}\n"
                f"⬇️ Download: {Config.BASE_URL}/download/{uuid}\n"
                f"🔗 Direct stream: {Config.BASE_URL}/stream/{uuid}"
            )

    if Config.INDEX_CHANNEL:
        @client.on_message(filters.channel & MEDIA_FILTER)
        async def on_channel_post(c, m):
            if str(m.chat.id) == str(Config.INDEX_CHANNEL):
                await index_message(m)
                log.info("Indexed channel post %s from %s", m.id, m.chat.title)


async def backfill_channel(client: Client):
    """Index recent posts of INDEX_CHANNEL (needs a user session — bots can't
    read channel history, they only get new posts)."""
    try:
        chat_id = int(Config.INDEX_CHANNEL)
        count = 0
        async for m in client.get_chat_history(chat_id, limit=Config.BACKFILL_LIMIT):
            if MEDIA_FILTER(m):
                if await index_message(m):
                    count += 1
        log.info("Backfill complete: %s new files indexed", count)
    except Exception as e:
        log.warning("Backfill skipped/failed: %s", e)


# --------------------------------------------------------------------- #
#  Web app                                                               #
# --------------------------------------------------------------------- #

@asynccontextmanager
async def lifespan(app: FastAPI):
    global bot, streamer
    problems = Config.validate()
    if problems:
        for p in problems:
            log.warning("Config: %s", p)
        log.warning("Running in catalog-only mode (web UI works, streaming is disabled)")
    else:
        bot = Client(
            "tgcdn",
            api_id=Config.API_ID,
            api_hash=Config.API_HASH,
            bot_token=Config.BOT_TOKEN or None,
            session_string=Config.SESSION_STRING or None,
            workdir=BASE_DIR,
        )
        register_bot(bot)
        await bot.start()
        streamer = TelegramStreamer(bot)
        me = await bot.get_me()
        log.info("Telegram ready as @%s", me.username or me.id)
        if Config.INDEX_CHANNEL and Config.SESSION_STRING:
            asyncio.create_task(backfill_channel(bot))
    yield
    if streamer:
        await streamer.close()
    if bot:
        await bot.stop()


app = FastAPI(title="StreamVault", lifespan=lifespan)
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")


@app.get("/")
async def home():
    return FileResponse(os.path.join(BASE_DIR, "static", "index.html"))


@app.get("/api/files")
async def list_files(q: str = "", kind: str = ""):
    return [row_to_json(r) for r in db.list(q=q, kind=kind)]


@app.get("/api/files/{uuid}")
async def get_file(uuid: str):
    row = db.get(uuid)
    if not row:
        raise HTTPException(404, "File not found")
    row = await ensure_metadata(row)   # one-time: fills in mime/size if missing
    return row_to_json(row)


@app.post("/api/files")
async def add_file(body: dict):
    file_id = (body.get("file_id") or "").strip()
    if not file_id:
        raise HTTPException(400, "file_id is required")
    try:
        FileId.decode(file_id)
    except Exception:
        raise HTTPException(400, "This is not a valid Telegram file_id")

    # Same file added before? Return the existing entry instead of a duplicate.
    existing = db.find_by_file_id(file_id)
    if existing is not None:
        row = await ensure_metadata(existing)
        return {
            "uuid": existing["uuid"],
            "watch": Config.BASE_URL + "/#/watch/" + existing["uuid"],
            "detected": {"mime": row["mime_type"], "size": row["file_size"]} if row else None,
        }
    uuid = db.add(
        file_id=file_id,
        file_name=body.get("file_name") or "",
        file_size=int(body.get("file_size") or 0),
        mime_type=body.get("mime_type") or "",
        caption="",
    )
    # Auto-detect mime + size straight from Telegram (a few seconds, one-time)
    row = await ensure_metadata(db.get(uuid))
    return {
        "uuid": uuid,
        "watch": f"{Config.BASE_URL}/#/watch/{uuid}",
        "detected": {"mime": row["mime_type"], "size": row["file_size"]} if row else None,
    }


@app.delete("/api/files/{uuid}")
async def delete_file(uuid: str):
    if not db.delete(uuid):
        raise HTTPException(404, "File not found")
    return {"ok": True}


@app.api_route("/stream/{uuid}", methods=["GET", "HEAD"])
async def stream_file(uuid: str, request: Request):
    row = db.get(uuid)
    if not row:
        raise HTTPException(404, "File not found")
    return await stream_response(row, request)


@app.api_route("/download/{uuid}", methods=["GET", "HEAD"])
async def download_file(uuid: str, request: Request):
    row = db.get(uuid)
    if not row:
        raise HTTPException(404, "File not found")
    return await stream_response(row, request, as_attachment=True)


@app.get("/thumb/{uuid}")
async def thumb_file(uuid: str, request: Request):
    row = db.get(uuid)
    if not row or not row["thumb_file_id"]:
        raise HTTPException(404, "No thumbnail")
    return await stream_response({**row, "file_id": row["thumb_file_id"],
                                  "mime_type": "image/jpeg"}, request)


if __name__ == "__main__":
    uvicorn.run("main:app", host=Config.HOST, port=Config.PORT, log_level="info")
