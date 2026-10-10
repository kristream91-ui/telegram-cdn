import os


class Config:
    """All configuration comes from environment variables (see .env.example)."""

    # --- Telegram credentials (https://my.telegram.org) ---
    API_ID = int(os.environ.get("API_ID", "0"))
    API_HASH = os.environ.get("API_HASH", "")

    # Bot token from @BotFather (recommended mode)
    BOT_TOKEN = os.environ.get("BOT_TOKEN", "")

    # Optional: a Pyrogram session string instead of a bot token.
    # User sessions can also backfill an entire channel's history.
    SESSION_STRING = os.environ.get("SESSION_STRING", "")

    # Optional: a channel/chat id whose new media posts get auto-indexed.
    # The bot must be an admin there. Channel posts (not bot DMs) only send
    # updates for NEW posts, so use SESSION_STRING for backfilling old ones.
    INDEX_CHANNEL = os.environ.get("INDEX_CHANNEL", "")

    # How many recent channel messages to index on startup (user session only)
    BACKFILL_LIMIT = int(os.environ.get("BACKFILL_LIMIT", "200"))

    # --- Web server ---
    BASE_URL = os.environ.get("BASE_URL", "http://localhost:8000")
    HOST = os.environ.get("HOST", "0.0.0.0")
    PORT = int(os.environ.get("PORT", "8000"))

    # Admin panel password (set as an env var on Render). Empty = panel disabled.
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")

    # The single admin account allowed to manage the library. The person who
    # logs in with this username (site login OR admin panel) sees the admin
    # tools; everyone else gets a plain viewer experience. Override with the
    # ADMIN_USER env var if you want a different name.
    ADMIN_USER = os.environ.get("ADMIN_USER", "Krish77")

    # --- Cloud Firestore (keeps the library across deploys) ---
    # Paste the whole Firebase service-account JSON as ONE line into the
    # FIREBASE_KEY env var on Render. When it is set, the catalog, posters,
    # banners, users and watch progress live in Firestore and survive every
    # redeploy. When it is empty the app uses the local SQLite file instead.
    FIREBASE_KEY = (
        os.environ.get("FIREBASE_KEY", "")
        or os.environ.get("FIREBASE_CREDENTIALS_JSON", "")
        or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON", "")
    )

    # Optional: YouTube Data API v3 key (Google Cloud -> APIs & Services).
    # With it, playlist imports are read through the official API (full
    # playlist + durations, no scraping). Without it the app scrapes the
    # public playlist page and falls back to the RSS feed (newest ~15).
    YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY", "")

    # Optional comma-separated admin user ids allowed to delete files
    # via the web UI (leave empty to let anyone delete — it's your call).
    ADMINS = {int(x) for x in os.environ.get("ADMINS", "").replace(",", " ").split() if x.strip()}

    @classmethod
    def validate(cls) -> list:
        problems = []
        if not cls.API_ID or not cls.API_HASH:
            problems.append("API_ID / API_HASH missing (get them from my.telegram.org)")
        if not cls.BOT_TOKEN and not cls.SESSION_STRING:
            problems.append("BOT_TOKEN or SESSION_STRING missing")
        return problems
