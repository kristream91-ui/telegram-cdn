# Ani77 — Next.js + Tailwind frontend

A React (Next.js App Router) + Tailwind CSS frontend for **Ani77**, a personal
OTT library. It talks to the Python API (FastAPI + **Pyrogram** bot + Firestore)
which stays deployed on Render. **Telegram only — there is no YouTube support.**

## Stack

| Piece | Tech |
|---|---|
| UI | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS 3 — palette taken from `Ani77logo.png` (deep navy → vivid blue) |
| Fonts | Poppins + Bebas Neue via `next/font/google` |
| Video | native `<video>` for MP4/WebM, `mpegts.js` for `.ts` streams |
| Data | the Python API (`NEXT_PUBLIC_API_BASE`) |

## Pages

| Route | What it does |
|---|---|
| `/` | Home — banner hero, Continue Watching, Recently Added, Series grid |
| `/search` | Full search: series / episodes / genres, filter chips, recent searches |
| `/watch/[uuid]` | Custom player (resume, auto-next, speed, PiP, fullscreen) + episode list |
| `/downloads` | Every file with download + copy-stream-link, sort and filter |
| `/settings` | Account, playback defaults, data, about |
| `/login` | Sign in / create account (username + password) |

## Local development

```bash
npm install
cp .env.example .env.local     # NEXT_PUBLIC_API_BASE=https://telegram-cdn.onrender.com
npm run dev                    # http://localhost:3000
```

## Deploy on Vercel

1. Push this folder (it lives in the repo under `web/`).
2. vercel.com → **Add New → Project** → import the repo.
3. **Root Directory → `web`** (the repo also holds the Python app).
4. Env var `NEXT_PUBLIC_API_BASE` = your Render URL → **Deploy**.

The Python API already allows cross-origin calls (CORS).

## Notes

- Sessions live in `localStorage` (`userTok`, `adminTok`) — an existing login carries over.
- No YouTube anywhere: no import endpoint, no embedded player, no `i.ytimg` thumbnails.
- Everything streams straight from your Telegram bot; nothing is re-hosted.
