"""Tiny SQLite catalog that maps short web ids -> Telegram file ids."""

import secrets
import sqlite3
import threading
import time


class Database:
    def __init__(self, path: str):
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS files (
                uuid         TEXT PRIMARY KEY,
                file_id      TEXT NOT NULL,
                file_name    TEXT DEFAULT '',
                file_size    INTEGER DEFAULT 0,
                mime_type    TEXT DEFAULT '',
                duration     INTEGER DEFAULT 0,
                width        INTEGER DEFAULT 0,
                height       INTEGER DEFAULT 0,
                thumb_file_id TEXT,
                chat_id      INTEGER,
                message_id   INTEGER,
                caption      TEXT DEFAULT '',
                created_at   REAL DEFAULT 0
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_msg
                ON files(chat_id, message_id) WHERE message_id IS NOT NULL;
            """
        )
        self._conn.commit()

    # ------------------------------------------------------------------ #

    def add(self, **row) -> str:
        """Insert a file record, returns the generated uuid."""
        uuid = secrets.token_hex(4)
        with self._lock:
            self._conn.execute(
                """
                INSERT OR IGNORE INTO files (
                    uuid, file_id, file_name, file_size, mime_type, duration,
                    width, height, thumb_file_id, chat_id, message_id,
                    caption, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    uuid,
                    row["file_id"],
                    row.get("file_name") or "",
                    row.get("file_size") or 0,
                    row.get("mime_type") or "",
                    row.get("duration") or 0,
                    row.get("width") or 0,
                    row.get("height") or 0,
                    row.get("thumb_file_id"),
                    row.get("chat_id"),
                    row.get("message_id"),
                    row.get("caption") or "",
                    row.get("created_at") or time.time(),
                ),
            )
            self._conn.commit()
        return uuid

    def get(self, uuid: str):
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM files WHERE uuid = ?", (uuid,)
            ).fetchone()
        return row

    def find_by_message(self, chat_id: int, message_id: int):
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM files WHERE chat_id = ? AND message_id = ?",
                (chat_id, message_id),
            ).fetchone()
        return row

    def update_file_id(self, uuid: str, file_id: str, thumb_file_id=None):
        with self._lock:
            self._conn.execute(
                "UPDATE files SET file_id = ?, thumb_file_id = COALESCE(?, thumb_file_id) "
                "WHERE uuid = ?",
                (file_id, thumb_file_id, uuid),
            )
            self._conn.commit()

    def update_meta(self, uuid: str, mime_type=None, file_size=0):
        """Fill in missing metadata (only overwrites empty fields)."""
        with self._lock:
            self._conn.execute(
                "UPDATE files SET mime_type = COALESCE(NULLIF(?, ''), mime_type), "
                "file_size = CASE WHEN file_size = 0 THEN ? ELSE file_size END "
                "WHERE uuid = ?",
                (mime_type, file_size, uuid),
            )
            self._conn.commit()

    def list(self, q: str = "", kind: str = "", limit: int = 1000):
        sql, params = "SELECT * FROM files", []
        where = []
        if q:
            where.append("(file_name LIKE ? OR caption LIKE ?)")
            params += [f"%{q}%", f"%{q}%"]
        if kind in ("video", "audio", "image", "doc"):
            if kind == "doc":
                where.append(
                    "(mime_type NOT LIKE 'video%' AND mime_type NOT LIKE 'audio%' "
                    "AND mime_type NOT LIKE 'image%')"
                )
            else:
                where.append("mime_type LIKE ?")
                params.append(f"{kind}%")
        if where:
            sql += " WHERE " + " AND ".join(where)
        sql += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        with self._lock:
            rows = self._conn.execute(sql, params).fetchall()
        return rows

    def delete(self, uuid: str) -> bool:
        with self._lock:
            cur = self._conn.execute("DELETE FROM files WHERE uuid = ?", (uuid,))
            self._conn.commit()
        return cur.rowcount > 0

    def count(self) -> int:
        with self._lock:
            (n,) = self._conn.execute("SELECT COUNT(*) FROM files").fetchone()
        return n
