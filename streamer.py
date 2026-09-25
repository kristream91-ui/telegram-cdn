"""Telegram file streaming core.

Streams any file directly from Telegram's data centers to an HTTP response
using only its bot-API file_id — nothing is written to disk. Supports HTTP
byte ranges (so video seeking works) and encrypted Telegram CDN redirects
(the same mechanism Pyrogram's own downloader uses).
"""

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
ALIGNMENT = 4096          # GetFile offsets must be divisible by this


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
        """Yield bytes of the file in [start, end] (inclusive, end=None = EOF)."""
        fid = FileId.decode(file_id)
        location = self._location(fid)
        session = await self._get_media_session(fid.dc_id)

        # Align the start down to GetFile's 4096-byte boundary, then skip the
        # surplus bytes from the first chunk.
        offset = start - (start % ALIGNMENT)
        skip = start - offset
        remaining = None if end is None else end - start + 1

        cdn_redirect = None  # set once Telegram moves us to its CDN
        cdn_session = None

        while True:
            if cdn_redirect is None:
                r = await session.invoke(
                    functions.upload.GetFile(
                        location=location, offset=offset, limit=CHUNK_SIZE
                    ),
                    sleep_threshold=30,
                )
                if isinstance(r, types.upload.FileCdnRedirect):
                    log.info("CDN redirect to DC %s for %s", r.dc_id, file_id[:16])
                    cdn_redirect = r
                    cdn_session = await self._get_cdn_session(r.dc_id)
                    continue
                if not isinstance(r, types.upload.File):
                    raise RuntimeError(f"Unexpected GetFile result: {type(r).__name__}")
                data = r.bytes
            else:
                data = await self._cdn_chunk(session, cdn_redirect, cdn_session, offset)

            if skip:
                data = data[skip:]
                skip = 0
            if remaining is not None:
                if remaining <= 0:
                    return
                if len(data) > remaining:
                    data = data[:remaining]

            yield data

            if remaining is not None:
                remaining -= len(data)
                if remaining <= 0:
                    return
            if len(data) == 0:
                return
            offset += CHUNK_SIZE

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
