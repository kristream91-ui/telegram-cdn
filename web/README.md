# Ani77 — Next.js + Tailwind frontend

A React (Next.js App Router) + Tailwind CSS rewrite of the Ani77 frontend.
It talks to the **existing Python API** (FastAPI + Pyrogram bot + Firestore),
which stays deployed on Render — nothing about the backend changes.

## Stack

| Piece | Tech |
|---|---|
| UI | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS 3 (design tokens in `tailwind.config.ts`) |
| Fonts | Poppins + Bebas Neue via `next/font/google` |
| Data | the Python API (`NEXT_PUBLIC_API_BASE`) |

## Local development

```bash
npm install
cp .env.example .env.local        # point it at your API
npm run dev                       # http://localhost:3000
```

`.env.local`:

```
NEXT_PUBLIC_API_BASE=https://telegram-cdn.onrender.com
```

## Deploy on Vercel (free)

1. Push this folder to GitHub (it lives in the repo under `web/`).
2. vercel.com → **Add New → Project** → import the repo.
3. **Root Directory → `web`** (important — the repo also holds the Python app).
4. Framework preset: **Next.js** (auto-detected).
5. Environment variable: `NEXT_PUBLIC_API_BASE` = your Render URL
   (`https://telegram-cdn.onrender.com`) → **Deploy**.

That's it — Vercel gives you a URL like `https://ani77.vercel.app`.
The Python API already allows cross-origin calls (CORS), so no extra setup.

## What is done so far

- [x] Project scaffold: Next.js App Router + TypeScript + Tailwind
- [x] Design system ported 1:1 (colours, fonts, buttons, pills, animations)
- [x] API client (`lib/api.ts`) + types + formatters
- [x] Shell: top nav with search, slide-in drawer, mobile bottom tab bar
- [x] Home page: rotating banner hero, Continue Watching, Recently Added,
      Series grid, Movies grid, search across series / genre / year / episode
- [x] `/watch/[uuid]` — custom player: MP4/WebM + `.ts` via mpegts.js, YouTube
      via the IFrame API, resume from saved position, 6-second auto-next
      overlay, speed (0.5–2×), volume/mute, seek with buffered track,
      ±10s, fullscreen, keyboard shortcuts, progress saved every 5s
- [x] Episode list under the player (thumbnails + per-episode progress)

## Still to come (next stages)
- [ ] `/series/[name]` — series page: banner backdrop, season picker, episode grid
- [ ] `/schedule` and `/settings` (downloads) pages
- [ ] Auth (login / signup) + synced watch progress
- [ ] `/admin` — files, add file, YouTube import, episode manager, series editor

## Notes

- Tokens live in `localStorage` (`userTok`, `adminTok`) exactly like before,
  so an existing session carries over.
- Images use plain `<img>` on purpose: thumbnails are served by the Python API
  (which 302-redirects YouTube thumbs) and from `i.ytimg.com`.
