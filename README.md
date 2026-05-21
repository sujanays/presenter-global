# presenter-global

A lightweight cross-platform presentation remote that lets your mobile phone control PowerPoint and Google Slides presentations running on your computer.

## Quick start (cloud backend + local desktop)

1. Copy `.env.example` to `.env` and set `BACKEND_URL` / `MOBILE_URL` to your Render URLs.
2. Set Render service env vars from `render.env.example` (backend needs Postgres + Redis URLs).
3. Run the desktop agent: `npm run desktop:dev`
4. Open the mobile URL on your phone and scan the desktop QR code.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run desktop:dev` | Electron desktop agent (loads root `.env`) |
| `npm run backend:dev` | Local API + WebSocket server |
| `npm run mobile:dev` | Local Next.js remote UI |
