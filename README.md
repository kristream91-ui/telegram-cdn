# StreamVault — Telegram File CDN + OTT Web App

Turn Telegram into your personal CDN. Files live on Telegram's servers; this
app streams them straight to the browser (with seeking support) through a
Netflix-style web UI. Nothing is stored on your server except a small SQLite
catalog of file ids.

```
Telegram DC  ──MTProto──►  Pyrogram  ──HTTP Range──►  Browser video player
```

## Features

- 🎬 **OTT-style web UI** — hero banner, category chips, search, thumbnails,
  "continue watching" (resumes where you left off), watch pages with a proper
  video/audio/image player.
- ⚡ **True streaming** — files are served chunk-by-chunk with HTTP byte-range
  support, so video seeking works without downloading the whole file.
- 🔐 **CDN redirect support** — Telegram often serves popular files from its
  encrypted CDN; those chunks are decrypted on the fly (same as Pyrogram does).
- 🤖 **Indexing via bot** — send or forward any file to your bot on Telegram and
  it gets added to the catalog instantly (bot replies with watch/download links).
- 📁 **Channel auto-index** — point `INDEX_CHANNEL` at a channel and every new
  media post is indexed automatically. With a user `SESSION_STRING` it can also
  backfill the channel's recent history.
- 🧩 **file_id API** — `POST /api/files` with any bot file_id to add files
  manually (`＋ Add` button in the UI).
- ♻️ **Self-healing** — expired file references are refreshed automatically by
  re-fetching the original message.

## Setup

### 1. Get credentials

1. Go to <https://my.telegram.org> → *API development tools* → create an app.
   Note down `API_ID` and `API_HASH`.
2. Talk to [@BotFather](https://t.me/BotFather) → `/newbot` → note the
   `BOT_TOKEN`.

### 2. Install and run

```bash
cd telegram-cdn
pip install -r requirements.txt

export API_ID=...        # or put everything in a .env file you source
export API_HASH=...
export BOT_TOKEN=...

python main.py
```

Open <http://localhost:8000> — done. 🎉

### 3. Add content

- **Easiest:** send any video/song/photo/document to your bot on Telegram.
  It replies with a watch link + download link.
- **By file_id:** use the `＋ Add` button in the web UI and paste a file_id
  (from this same bot).
- **Channel mode:** add the bot as admin to a channel, set `INDEX_CHANNEL`
  (and optionally `SESSION_STRING` for history backfill), and every new post
  with media is indexed on its own.

## Endpoints

| Route | What it does |
|---|---|
| `GET /` | Web UI |
| `GET /api/files?q=&kind=` | Catalog JSON |
| `POST /api/files` | Add by `file_id` |
| `DELETE /api/files/{uuid}` | Remove from catalog |
| `GET /stream/{uuid}` | Range-aware inline stream |
| `GET /download/{uuid}` | Same, but as a download |
| `GET /thumb/{uuid}` | Video/photo thumbnail |

## Deploy notes

- Set `BASE_URL` to your public URL (used in bot replies).
- Behind nginx/Caddy, disable request buffering (`proxy_buffering off;` /
  `flushes instantly`) so streaming isn't delayed.
- Works fine on a cheap VPS or free-tier hosts that allow long-lived
  processes (Railway, Render, Fly.io...). Python 3.9+ recommended.

## Troubleshooting

- **405/403 from Telegram while starting** — wrong `API_ID`/`API_HASH`.
- **410 file reference expired** on manually-added files — file_ids from
  messages the bot can still access are refreshed automatically; ones whose
  source message is gone can't be refreshed.
- **No seek bar** on a manually-added file — pass its `file_size` (and ideally
  `mime_type`) in `POST /api/files`; without a known size the browser can't
  seek.
- **Bots can't read channel history** — that's a Telegram limitation, not a
  bug. Use `SESSION_STRING` for backfill, or forward files to the bot in DM.
