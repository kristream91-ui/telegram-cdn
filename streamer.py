"""Telegram file streaming core.

Streams any file directly from Telegram's data centers to an HTTP response
using only its bot-API file_id — nothing is written to disk. Supports HTTP
byte ranges (so video seeking works) and encrypted Telegram CDN redirects
(the same mechanism Pyrogram's own downloader uses).

Also probes files (binary-search for EOF + magic-byte sniffing + codec scan)
so manually added file_ids get a proper mime type, size, and codec info —
without them the web UI can't show a video player or warn about files
that no browser can play.
"""

import asyncio
import logging
from typing import AsyncGenerator, Optional

from pyrogram import Client
from pyrogram.crypto import aes
from pyrogram.errors import VolumeLocNotFound
from pyrogram.file_id import FileId, FileType
from pyrogram.raw import functions, types
from pyrogram.session import Auth, Session

log = logging.getLogger("tgcdn.streamer")

CHUNK_SIZE = 1024 * 1024  # 1 MiB — the max GetFile limit
ALIGNMENT = 4096          # GetFile offsets AND limits must be multiples of this
PREFETCH = 3              # chunks kept in flight for smooth playback
PROBE_CAP = 1 << 40       # sanity cap while searching for EOF (1 TB)


def sniff_mime(head: bytes, fallback=None) -> str:
    """Guess the mime type from the first bytes of a file."""
    if len(head) >= 12 and head[4:8] == b"ftyp":
        if head[8:12] in (b"M4A ", b"M4B ", b"M4P "):
            return "audio/mp4"
        return "video/mp4"
    if head[:4] == bytes.fromhex("1a45dfa3"):          # EBML: mkv/webm
        return "video/webm" if b"webm" in head[:64] else "video/x-matroska"
    if head[:3] == b"ID3" or (
        len(head) >= 2 and head[0] == 0xFF and (head[1] & 0xE0) == 0xE0
    ):
        return "audio/mpeg"
    if head[:4] == b"OggS":
        return "audio/ogg"
    if head[:4] == b"fLaC":
        return "audio/flac"
    if head[:4] == b"RIFF" or head[:12] == b"RIFF" + head[4:8] + b"":
        if head[8:12] == b"WAVE":
            return "audio/wav"
        if head[8:12] == b"AVI ":
            return "video/x-msvideo"
    if head[:2] == b"\xff\xd8":
        return "image/jpeg"
    if head[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if head[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if head[:5] == b"%PDF-":
        return "application/pdf"
    if head[:2] == b"PK":
        return "application/zip"
    if head[:3] == b"FLV":
        return "video/x-flv"
    if head[:4] == b"\x30\x26\xb2\x75":                  # ASF / WMV
        return "video/x-ms-wmv"
    if len(head) > 376 and head[0] == 0x47 and head[188] == 0x47 and head[376] == 0x47:
        return "video/mp2t"                              # MPEG-TS
    # MP4-family boxes can sit past leading junk — scan the whole head.
    if b"ftyp" in head or b"moov" in head or b"mdat" in head:
        return "video/mp4"
    if fallback is not None:
        return {
            FileType.VIDEO: "video/mp4",
            FileType.AUDIO: "audio/mpeg",
            FileType.VOICE: "audio/ogg",
            FileType.PHOTO: "image/jpeg",
        }.get(fallback, "application/octet-stream")
    return "application/octet-stream"


VIDEO_CODECS = {"avc1": "H.264", "avc3": "H.264", "hvc1": "HEVC", "hev1": "HEVC",
                "av01": "AV1", "mp4v": "MPEG-4", "vp09": "VP9"}
AUDIO_CODECS = {"mp4a": "AAC", "ac-3": "AC-3", "ec-3": "EAC-3", "Opus": "Opus",
                ".mp3": "MP3", "samr": "AMR"}


def scan_codecs(data: bytes) -> str:
    """Scan MP4 moov-box bytes for codec fourccs, e.g. 'H.264 video + AAC audio'."""
    video = [name for tag, name in VIDEO_CODECS.items() if tag.encode() in data]
    audio = [name for tag, name in AUDIO_CODECS.items() if tag.encode() in data]
    parts = []
    if video:
        parts.append(video[0] + " video")
    if audio:
        parts.append(audio[0] + " audio")
    return " + ".join(parts)


class TelegramStreamer:
    """Stream files from Telegram DCs using just a bot-API file_id."""

    def __init__(self, client: Client):
        self.client = client
        self._media_sessions: dict = {}
        self._cdn_sessions: dict = {}

    # ------------------------------------------------------------------ #
    #  Session helpers                                                    #
    # ------------------------------------------------------------------ #

    async def _get_media_session(self, dc_id: int) -> Session:
        if dc_id in self._media_sessions:
            return self._media_sessions[dc_id]

        session = Session(
            self.client,
            dc_id,
            await Auth(self.client, dc_id, await self.client.storage.test_mode()).create()
            if dc_id != await self.client.storage.dc_id()
            else await self.client.storage.auth_key(),
            await self.client.storage.test_mode(),
            is_media=True,
        )
        await session.start()

        if dc_id != await self.client.storage.dc_id():
            exported = await self.client.invoke(
                functions.auth.ExportAuthorization(dc_id=dc_id)
            )
            await session.invoke(
                functions.auth.ImportAuthorization(
                    id=exported.id, bytes=exported.bytes
                )
            )

        self._media_sessions[dc_id] = session
        log.info("Media session ready for DC %s", dc_id)
        return session

    async def _get_cdn_session(self, dc_id: int) -> Session:
        """CDN sessions only need a fresh auth key, no authorization import."""
        if dc_id in self._cdn_sessions:
            return self._cdn_sessions[dc_id]
        session = Session(
            self.client,
            dc_id,
            await Auth(self.client, dc_id, await self.client.storage.test_mode()).create(),
            await self.client.storage.test_mode(),
            is_media=True,
            is_cdn=True,
        )
        await session.start()
        self._cdn_sessions[dc_id] = session
        return session

    # ------------------------------------------------------------------ #
    #  Streaming                                                          #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _location(fid: FileId):
        if fid.file_type == FileType.PHOTO:
            return types.InputPhotoFileLocation(
                id=fid.media_id,
                access_hash=fid.access_hash,
                file_reference=fid.file_reference,
                thumb_size=fid.thumbnail_size or "",
            )
        # Documents, videos, audio, voice and thumbnails all use this one.
        return types.InputDocumentFileLocation(
            id=fid.media_id,
            access_hash=fid.access_hash,
            file_reference=fid.file_reference,
            thumb_size=fid.thumbnail_size or "",
        )

    async def iter_file(
        self, file_id: str, start: int = 0, end: Optional[int] = None
    ) -> AsyncGenerator[bytes, None]:
        """Yield bytes of the file in [start, end] (inclusive, end=None = EOF).

        Keeps up to PREFETCH chunks in flight so the browser gets data faster
        than one Telegram round-trip at a time.
        """
        fid = FileId.decode(file_id)
        location = self._location(fid)
        session = await self._get_media_session(fid.dc_id)

        # Align the start down to GetFile's 4096-byte boundary, then skip the
        # surplus bytes from the first chunk.
        offset = start - (start % ALIGNMENT)
        skip = start - offset
        remaining = None if end is None else end - start + 1

        # Telegram requires each GetFile request to stay inside a single
        # 1 MiB block of the file: offset % 4096 == 0, limit % 4096 == 0,
        # and offset/(1MB) == (offset+limit-1)/(1MB). So a request from an
        # unaligned offset gets a shorter first part.
        def part_limit(off: int) -> int:
            return min(CHUNK_SIZE, CHUNK_SIZE - (off % CHUNK_SIZE))

        cdn_redirect = None
        cdn_session = None

        async def fetch(off: int) -> bytes:
            nonlocal cdn_redirect, cdn_session
            if cdn_redirect is None:
                r = await session.invoke(
                    functions.upload.GetFile(
                        location=location, offset=off, limit=part_limit(off)
                    ),
                    sleep_threshold=30,
                )
                if isinstance(r, types.upload.FileCdnRedirect):
                    log.info("CDN redirect to DC %s", r.dc_id)
                    cdn_redirect = r
                    cdn_session = await self._get_cdn_session(r.dc_id)
                    return await fetch(off)
                if not isinstance(r, types.upload.File):
                    raise RuntimeError(f"Unexpected GetFile result: {type(r).__name__}")
                return r.bytes
            return await self._cdn_chunk(session, cdn_redirect, cdn_session, off)

        inflight: dict = {}

        def prime(off: int):
            for _ in range(PREFETCH):
                if end is not None and off > end:
                    break
                if off not in inflight:
                    inflight[off] = asyncio.ensure_future(fetch(off))
                off += part_limit(off)

        try:
            prime(offset)
            while True:
                cur = offset
                task = inflight.pop(cur, None)
                if task is None:
                    task = asyncio.ensure_future(fetch(cur))

                raw = await task
                if not raw:
                    return
                offset += len(raw)
                prime(offset)  # keep the pipeline full while we send this chunk

                eof = len(raw) < part_limit(cur)
                if skip:
                    raw = raw[skip:]
                    skip = 0
                if remaining is not None:
                    if remaining <= 0:
                        return
                    if len(raw) > remaining:
                        raw = raw[:remaining]
                yield raw
                if eof:
                    return
                if remaining is not None:
                    remaining -= len(raw)
                    if remaining <= 0:
                        return
        finally:
            for t in inflight.values():
                t.cancel()

    # ------------------------------------------------------------------ #
    #  Probing (for manually added file_ids)                              #
    # ------------------------------------------------------------------ #

    async def probe_file(self, file_id: str) -> tuple:
        """Find (file_size, mime_type, codecs) for a file_id using tiny GetFile
        calls. Sniffs the header for the mime type, binary-searches for the
        exact end of the file, and scans the moov box for codec fourccs."""
        fid = FileId.decode(file_id)
        location = self._location(fid)
        session = await self._get_media_session(fid.dc_id)

        async def peek(offset: int, limit: int = ALIGNMENT) -> bytes:
            # NOTE: limit must be a multiple of 4096, <= 1MB, and the whole
            # request must stay inside one 1MB block of the file.
            r = await session.invoke(
                functions.upload.GetFile(
                    location=location, offset=offset, limit=limit
                )
            )
            if isinstance(r, types.upload.FileCdnRedirect):
                raise RuntimeError("CDN-redirected file cannot be probed")
            return r.bytes

        head = await peek(0, ALIGNMENT)
        if not head:
            raise RuntimeError("file is empty")
        mime = sniff_mime(head, fallback=fid.file_type)

        if len(head) < ALIGNMENT:
            return len(head), mime, scan_codecs(head)

        # Binary search for the largest 4096-aligned offset that still has
        # data; invariant: peek(lo) non-empty, peek(hi) empty.
        lo, hi = ALIGNMENT, ALIGNMENT * 2
        while await peek(min(hi, PROBE_CAP)):
            lo = hi
            hi *= 2
            if hi > PROBE_CAP:
                break
        while hi - lo > ALIGNMENT:
            mid = ((lo + hi) // 2 // ALIGNMENT) * ALIGNMENT
            if mid <= lo:
                mid = lo + ALIGNMENT
            if await peek(mid):
                lo = mid
            else:
                hi = mid
        size = lo + len(await peek(lo, ALIGNMENT))  # tail is always <= 4096

        # codec sniff: the moov box sits either at the start or the end
        codecs = await self._codec_sniff(session, peek, head, size)
        return size, mime, codecs

    async def _codec_sniff(self, session, peek, head: bytes, size: int) -> str:
        """Fetch the moov box region (start or end of file) and scan it."""
        data = head if b"moov" in head else b""
        if not data and size:
            tail_off = max(0, ((size - 1) // CHUNK_SIZE) * CHUNK_SIZE)
            tail_len = min(
                CHUNK_SIZE,
                ((size - tail_off + ALIGNMENT - 1) // ALIGNMENT) * ALIGNMENT,
            )
            if tail_len > 0:
                data = await peek(tail_off, tail_len)
        return scan_codecs(data) if data else ""

    async def probe_codecs(self, file_id: str, size: int) -> str:
        """Fast codec-only sniff (2 requests) for files whose size is known."""
        fid = FileId.decode(file_id)
        location = self._location(fid)
        session = await self._get_media_session(fid.dc_id)

        async def peek(offset: int, limit: int) -> bytes:
            r = await session.invoke(
                functions.upload.GetFile(
                    location=location, offset=offset, limit=limit
                )
            )
            if isinstance(r, types.upload.FileCdnRedirect):
                raise RuntimeError("CDN-redirected file cannot be probed")
            return r.bytes

        head = await peek(0, ALIGNMENT)
        return await self._codec_sniff(session, peek, head, size)

    # ------------------------------------------------------------------ #

    async def _cdn_chunk(
        self, session: Session, redirect, cdn_session: Session, offset: int
    ) -> bytes:
        """Fetch + decrypt one chunk from Telegram's encrypted CDN."""
        for attempt in range(3):
            r = await cdn_session.invoke(
                functions.upload.GetCdnFile(
                    file_token=redirect.file_token,
                    offset=offset,
                    limit=CHUNK_SIZE,
                )
            )

            if isinstance(r, types.upload.CdnFileReuploadNeeded):
                try:
                    await session.invoke(
                        functions.upload.ReuploadCdnFile(
                            file_token=redirect.file_token,
                            request_token=r.request_token,
                        )
                    )
                except VolumeLocNotFound:
                    raise RuntimeError("CDN reupload failed for this chunk")
                continue  # retry the same offset

            # AES-CTR decryption, counter offset by offset/16 blocks
            # (see https://core.telegram.org/cdn#decrypting-files)
            return aes.ctr256_decrypt(
                r.bytes,
                redirect.encryption_key,
                bytearray(
                    redirect.encryption_iv[:-4]
                    + (offset // 16).to_bytes(4, "big")
                ),
            )

        raise RuntimeError("CDN chunk kept asking for reupload")

    async def close(self):
        for s in list(self._media_sessions.values()) + list(self._cdn_sessions.values()):
            try:
                await s.stop()
            except Exception:
                pass
        self._media_sessions.clear()
        self._cdn_sessions.clear()
