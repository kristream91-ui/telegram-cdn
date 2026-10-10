"""Catalog storage for Ani77 — short web ids -> Telegram file ids.

Two interchangeable backends share one interface:

  * Database          — local SQLite. Zero setup, but a free-tier redeploy
                        wipes the file (so the library must be re-added).
  * FirestoreDatabase — Google Cloud Firestore. The catalog, posters, banners,
                        users and watch progress survive every deploy.

make_database() returns the Firestore one when a service-account key is
configured, and quietly falls back to SQLite when it is not.
"""

import json
import secrets
import sqlite3
import threading
import time


class Database:
    backend = "sqlite"

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
        # migration for older DBs
        try:
            self._conn.execute("ALTER TABLE files ADD COLUMN codecs TEXT DEFAULT ''")
        except sqlite3.OperationalError:
            pass
        # series grouping (Season/Episode organization) + content details
        for col in ("series TEXT", "season INTEGER", "episode INTEGER",
                    "source TEXT DEFAULT 'telegram'", "yt_id TEXT DEFAULT ''"):
            try:
                self._conn.execute(f"ALTER TABLE files ADD COLUMN {col}")
            except sqlite3.OperationalError:
                pass
        self._conn.execute(
            """CREATE TABLE IF NOT EXISTS series_meta (
                name        TEXT PRIMARY KEY,
                description TEXT DEFAULT '',
                year        TEXT DEFAULT '',
                genre       TEXT DEFAULT ''
            )"""
        )
        # poster images for series (data-URL text; same lifespan as the DB)
        try:
            self._conn.execute("ALTER TABLE series_meta ADD COLUMN poster TEXT DEFAULT ''")
        except sqlite3.OperationalError:
            pass
        # hero banners (horizontal images for the home hero / series page)
        try:
            self._conn.execute("ALTER TABLE series_meta ADD COLUMN banner TEXT DEFAULT ''")
        except sqlite3.OperationalError:
            pass
        # user profiles (sign up / log in) + per-user watch progress
        self._conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                uid        INTEGER PRIMARY KEY AUTOINCREMENT,
                username   TEXT UNIQUE NOT NULL COLLATE NOCASE,
                pass_hash  TEXT NOT NULL,
                created_at REAL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS user_progress (
                uid        INTEGER NOT NULL,
                uuid       TEXT NOT NULL,
                pos        REAL DEFAULT 0,
                dur        REAL DEFAULT 0,
                updated_at REAL DEFAULT 0,
                PRIMARY KEY (uid, uuid)
            );
            CREATE TABLE IF NOT EXISTS settings (
                key   TEXT PRIMARY KEY,
                value TEXT
            );
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
                    caption, created_at, series, season, episode, source, yt_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    row.get("series"),
                    int(row.get("season") or 0),
                    int(row.get("episode") or 0),
                    row.get("source") or "telegram",
                    row.get("yt_id") or "",
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

    def find_by_file_id(self, file_id: str):
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM files WHERE file_id = ? "
                "ORDER BY created_at DESC LIMIT 1",
                (file_id,),
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

    def update_name(self, uuid: str, file_name: str):
        with self._lock:
            self._conn.execute(
                "UPDATE files SET file_name = ? WHERE uuid = ?",
                (file_name, uuid),
            )
            self._conn.commit()

    def update_group(self, uuid: str, series, season: int = 0, episode: int = 0):
        """Set/clear a file's series grouping (series=None -> standalone)."""
        with self._lock:
            self._conn.execute(
                "UPDATE files SET series = ?, season = ?, episode = ? WHERE uuid = ?",
                (series, int(season or 0), int(episode or 0), uuid),
            )
            self._conn.commit()

    def set_series_meta(self, name: str, description: str = "", year: str = "", genre: str = ""):
        """Content details for a series (upsert)."""
        with self._lock:
            self._conn.execute(
                """INSERT INTO series_meta (name, description, year, genre)
                   VALUES (?, ?, ?, ?)
                   ON CONFLICT(name) DO UPDATE SET
                     description = excluded.description,
                     year = excluded.year,
                     genre = excluded.genre""",
                (name, description, year, genre),
            )
            self._conn.commit()

    def set_series_poster(self, name: str, poster: str = ""):
        """Poster image (data-URL) for a series (upsert; empty string clears)."""
        with self._lock:
            self._conn.execute(
                """INSERT INTO series_meta (name, poster)
                   VALUES (?, ?)
                   ON CONFLICT(name) DO UPDATE SET poster = excluded.poster""",
                (name, poster),
            )
            self._conn.commit()

    def series_poster(self, name: str) -> str:
        with self._lock:
            row = self._conn.execute(
                "SELECT poster FROM series_meta WHERE name = ?", (name,)
            ).fetchone()
        return (row["poster"] or "") if row else ""

    def series_banner(self, name: str) -> str:
        with self._lock:
            row = self._conn.execute(
                "SELECT banner FROM series_meta WHERE name = ?", (name,)
            ).fetchone()
        return (row["banner"] or "") if row else ""

    def set_series_banner(self, name: str, banner: str = ""):
        """Hero banner image (data-URL) for a series (upsert; empty clears)."""
        with self._lock:
            self._conn.execute(
                """INSERT INTO series_meta (name, banner)
                   VALUES (?, ?)
                   ON CONFLICT(name) DO UPDATE SET banner = excluded.banner""",
                (name, banner),
            )
            self._conn.commit()

    def series_meta_all(self):
        """Content details for all series (poster/banner NOT included — big)."""
        with self._lock:
            return self._conn.execute(
                "SELECT name, description, year, genre, "
                "CASE WHEN poster IS NOT NULL AND poster != '' THEN 1 ELSE 0 END AS has_poster, "
                "CASE WHEN banner IS NOT NULL AND banner != '' THEN 1 ELSE 0 END AS has_banner "
                "FROM series_meta ORDER BY name"
            ).fetchall()

    def update_codecs(self, uuid: str, codecs: str = ""):
        if not codecs:
            return
        with self._lock:
            self._conn.execute(
                "UPDATE files SET codecs = ? WHERE uuid = ?", (codecs, uuid)
            )
            self._conn.commit()

    def update_meta(self, uuid: str, mime_type=None, file_size=0, duration=0):
        """Fill in missing metadata (only overwrites empty/zero fields)."""
        with self._lock:
            self._conn.execute(
                "UPDATE files SET mime_type = COALESCE(NULLIF(?, ''), mime_type), "
                "file_size = CASE WHEN file_size = 0 THEN ? ELSE file_size END, "
                "duration = CASE WHEN duration = 0 THEN ? ELSE duration END "
                "WHERE uuid = ?",
                (mime_type, file_size, duration or 0, uuid),
            )
            self._conn.commit()

    def list(self, q: str = "", kind: str = "", limit: int = 1000):
        sql, params = "SELECT * FROM files", []
        where = []
        if q:
            where.append("(file_name LIKE ? OR caption LIKE ? OR series LIKE ?)")
            params += [f"%{q}%", f"%{q}%", f"%{q}%"]
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

    # ------------------------------------------------------------------ #
    #  Users & profiles                                                   #
    # ------------------------------------------------------------------ #

    def get_setting(self, key: str, default=None):
        with self._lock:
            row = self._conn.execute(
                "SELECT value FROM settings WHERE key = ?", (key,)
            ).fetchone()
        return row["value"] if row else default

    def set_setting(self, key: str, value: str):
        with self._lock:
            self._conn.execute(
                "INSERT INTO settings (key, value) VALUES (?, ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (key, value),
            )
            self._conn.commit()

    def create_user(self, username: str, pass_hash: str) -> int:
        with self._lock:
            cur = self._conn.execute(
                "INSERT INTO users (username, pass_hash, created_at) VALUES (?, ?, ?)",
                (username, pass_hash, time.time()),
            )
            self._conn.commit()
            return cur.lastrowid

    def get_user_by_name(self, username: str):
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM users WHERE username = ?", (username,)
            ).fetchone()
        return row

    def get_user(self, uid: int):
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM users WHERE uid = ?", (uid,)
            ).fetchone()
        return row

    def set_progress(self, uid: int, uuid: str, pos: float, dur: float):
        """Upsert a user's watch position for a file."""
        with self._lock:
            self._conn.execute(
                "INSERT INTO user_progress (uid, uuid, pos, dur, updated_at) "
                "VALUES (?, ?, ?, ?, ?) "
                "ON CONFLICT(uid, uuid) DO UPDATE SET "
                "pos = excluded.pos, dur = excluded.dur, "
                "updated_at = excluded.updated_at",
                (uid, uuid, pos, dur, time.time()),
            )
            self._conn.commit()

    def progress_all(self, uid: int) -> dict:
        with self._lock:
            rows = self._conn.execute(
                "SELECT uuid, pos, dur FROM user_progress WHERE uid = ?", (uid,)
            ).fetchall()
        return {r["uuid"]: {"pos": r["pos"], "dur": r["dur"]} for r in rows}


# --------------------------------------------------------------------- #
#  Cloud Firestore backend                                               #
# --------------------------------------------------------------------- #

def _now() -> float:
    return time.time()


class FirestoreDatabase:
    """Same interface as Database, backed by Google Cloud Firestore.

    The files collection is tiny (a few hundred docs at most), so it is
    cached in memory and filtered in Python — that keeps reads instant and
    costs a single collection read per process instead of one per request.
    Every write invalidates the cache.
    """

    backend = "firestore"

    FILES = "files"
    META = "series_meta"
    USERS = "users"
    PROGRESS = "user_progress"
    SETTINGS = "settings"

    def __init__(self, key_json: str = "", client=None):
        self._lock = threading.Lock()
        self._cache = None
        if client is not None:                 # tests / advanced use
            self._fs = client
        else:
            import firebase_admin
            from firebase_admin import credentials, firestore
            info = json.loads(key_json) if isinstance(key_json, str) else key_json
            cred = credentials.Certificate(info)
            if not firebase_admin._apps:
                firebase_admin.initialize_app(cred)
            self._fs = firestore.client()

    # ---------------------------------------------------------------- #

    def _all(self):
        if self._cache is None:
            self._cache = [dict(d.to_dict() or {})
                           for d in self._fs.collection(self.FILES).stream()]
        return self._cache

    def _bust(self):
        self._cache = None

    def _doc(self, uuid: str):
        return self._fs.collection(self.FILES).document(uuid)

    # ---------------------------------------------------------------- #
    #  files

    def add(self, **row) -> str:
        uuid = secrets.token_hex(4)
        chat_id = row.get("chat_id")
        message_id = row.get("message_id")
        rec = {
            "uuid": uuid,
            "file_id": row["file_id"],
            "file_name": row.get("file_name") or "",
            "file_size": int(row.get("file_size") or 0),
            "mime_type": row.get("mime_type") or "",
            "duration": int(row.get("duration") or 0),
            "width": int(row.get("width") or 0),
            "height": int(row.get("height") or 0),
            "thumb_file_id": row.get("thumb_file_id") or "",
            "chat_id": chat_id,
            "message_id": message_id,
            "caption": row.get("caption") or "",
            "created_at": float(row.get("created_at") or _now()),
            "codecs": row.get("codecs") or "",
            "series": row.get("series"),
            "season": int(row.get("season") or 0),
            "episode": int(row.get("episode") or 0),
            "source": row.get("source") or "telegram",
            "yt_id": row.get("yt_id") or "",
        }
        # same de-dupe rule as the SQLite unique index (chat + message)
        if chat_id and message_id:
            for r in self._all():
                if r.get("chat_id") == chat_id and r.get("message_id") == message_id:
                    self.update_file_id(r["uuid"], rec["file_id"], rec["thumb_file_id"])
                    return r["uuid"]
        self._doc(uuid).set(rec)
        self._bust()
        return uuid

    def get(self, uuid: str):
        for r in self._all():
            if r.get("uuid") == uuid:
                return r
        return None

    def find_by_message(self, chat_id: int, message_id: int):
        for r in self._all():
            if r.get("chat_id") == chat_id and r.get("message_id") == message_id:
                return r
        return None

    def find_by_file_id(self, file_id: str):
        hits = [r for r in self._all() if r.get("file_id") == file_id]
        if not hits:
            return None
        hits.sort(key=lambda r: r.get("created_at") or 0, reverse=True)
        return hits[0]

    def _patch(self, uuid: str, fields: dict):
        self._doc(uuid).set(fields, merge=True)
        self._bust()

    def update_file_id(self, uuid: str, file_id: str, thumb_file_id=None):
        fields = {"file_id": file_id}
        if thumb_file_id:
            fields["thumb_file_id"] = thumb_file_id
        self._patch(uuid, fields)

    def update_name(self, uuid: str, file_name: str):
        self._patch(uuid, {"file_name": file_name})

    def update_group(self, uuid: str, series, season: int = 0, episode: int = 0):
        self._patch(uuid, {"series": series,
                           "season": int(season or 0),
                           "episode": int(episode or 0)})

    def update_codecs(self, uuid: str, codecs: str = ""):
        if codecs:
            self._patch(uuid, {"codecs": codecs})

    def update_meta(self, uuid: str, mime_type=None, file_size=0, duration=0):
        row = self.get(uuid) or {}
        fields = {}
        if mime_type and not (row.get("mime_type") or ""):
            fields["mime_type"] = mime_type
        elif mime_type and (row.get("mime_type") or "") == "application/octet-stream":
            fields["mime_type"] = mime_type
        if file_size and not (row.get("file_size") or 0):
            fields["file_size"] = int(file_size)
        if duration and not (row.get("duration") or 0):
            fields["duration"] = int(duration)
        if fields:
            self._patch(uuid, fields)

    def list(self, q: str = "", kind: str = "", limit: int = 1000):
        rows = list(self._all())
        if q:
            ql = q.lower()
            rows = [r for r in rows
                    if ql in (r.get("file_name") or "").lower()
                    or ql in (r.get("caption") or "").lower()
                    or ql in (r.get("series") or "").lower()]
        if kind in ("video", "audio", "image", "doc"):
            if kind == "doc":
                rows = [r for r in rows
                        if not str(r.get("mime_type") or "").startswith(
                            ("video", "audio", "image"))]
            else:
                rows = [r for r in rows
                        if str(r.get("mime_type") or "").startswith(kind)]
        rows.sort(key=lambda r: r.get("created_at") or 0, reverse=True)
        return rows[:limit]

    def delete(self, uuid: str) -> bool:
        if self.get(uuid) is None:
            return False
        self._doc(uuid).delete()
        self._bust()
        return True

    def count(self) -> int:
        return len(self._all())

    # ---------------------------------------------------------------- #
    #  series details (poster / banner / description)

    def _meta_doc(self, name: str):
        return self._fs.collection(self.META).document(name or "")

    def set_series_meta(self, name: str, description: str = "", year: str = "", genre: str = ""):
        self._meta_doc(name).set({"name": name, "description": description,
                                  "year": year, "genre": genre}, merge=True)

    def set_series_poster(self, name: str, poster: str = ""):
        self._meta_doc(name).set({"name": name, "poster": poster}, merge=True)

    def series_poster(self, name: str) -> str:
        snap = self._meta_doc(name).get()
        return (snap.to_dict() or {}).get("poster") or "" if snap.exists else ""

    def set_series_banner(self, name: str, banner: str = ""):
        self._meta_doc(name).set({"name": name, "banner": banner}, merge=True)

    def series_banner(self, name: str) -> str:
        snap = self._meta_doc(name).get()
        return (snap.to_dict() or {}).get("banner") or "" if snap.exists else ""

    def series_meta_all(self):
        out = []
        for d in self._fs.collection(self.META).stream():
            m = dict(d.to_dict() or {})
            out.append({
                "name": m.get("name") or d.id,
                "description": m.get("description") or "",
                "year": m.get("year") or "",
                "genre": m.get("genre") or "",
                "has_poster": 1 if m.get("poster") else 0,
                "has_banner": 1 if m.get("banner") else 0,
            })
        out.sort(key=lambda m: m["name"])
        return out

    # ---------------------------------------------------------------- #
    #  settings

    def get_setting(self, key: str, default=None):
        snap = self._fs.collection(self.SETTINGS).document(key).get()
        if not snap.exists:
            return default
        val = (snap.to_dict() or {}).get("value")
        return default if val is None else val

    def set_setting(self, key: str, value: str):
        self._fs.collection(self.SETTINGS).document(key).set({"value": value})

    # ---------------------------------------------------------------- #
    #  users & progress

    def _user_doc(self, uid: int):
        return self._fs.collection(self.USERS).document(str(uid))

    def create_user(self, username: str, pass_hash: str) -> int:
        uid = int(self.get_setting("uid_seq", 0) or 0) + 1
        self.set_setting("uid_seq", str(uid))
        self._user_doc(uid).set({
            "uid": uid, "username": username,
            "uname": (username or "").lower(),
            "pass_hash": pass_hash, "created_at": _now(),
        })
        return uid

    def get_user_by_name(self, username: str):
        want = (username or "").lower()
        for d in self._fs.collection(self.USERS).where("uname", "==", want).limit(1).stream():
            return dict(d.to_dict() or {})
        return None

    def get_user(self, uid: int):
        snap = self._user_doc(uid).get()
        return dict(snap.to_dict() or {}) if snap.exists else None

    def set_progress(self, uid: int, uuid: str, pos: float, dur: float):
        self._fs.collection(self.PROGRESS).document(f"{uid}_{uuid}").set({
            "uid": uid, "uuid": uuid, "pos": float(pos), "dur": float(dur),
            "updated_at": _now(),
        })

    def progress_all(self, uid: int) -> dict:
        out = {}
        for d in self._fs.collection(self.PROGRESS).where("uid", "==", uid).stream():
            r = d.to_dict() or {}
            out[r.get("uuid")] = {"pos": r.get("pos") or 0, "dur": r.get("dur") or 0}
        return out


# --------------------------------------------------------------------- #
#  factory                                                               #
# --------------------------------------------------------------------- #

def make_database(sqlite_path: str, firebase_key: str = ""):
    """Firestore when a service-account key is present, else local SQLite."""
    key = (firebase_key or "").strip()
    if key:
        try:
            store = FirestoreDatabase(key)
            print("[store] using Cloud Firestore (data survives redeploys)")
            return store
        except Exception as e:                      # bad key / no network
            print(f"[store] Firestore unavailable ({e}) — falling back to SQLite")
    return Database(sqlite_path)
