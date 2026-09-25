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
