snookie.online
================

This repo contains the static front-end and a helper serverless proxy for a YouTube→MP3 workflow.

Structure
- `index.html`, `styles.css` — front-end UI (served statically)
- `api/download.js` — Vercel serverless proxy that forwards requests to a converter service
- `converter-server/` — local Node/Express converter (streams ytdl/ffmpeg). NOT deployed to Vercel.

Important: Vercel cannot reliably run long-running ffmpeg/yt-dlp conversions. Host the converter
on a separate server (VPS, Render, or your XAMPP machine) and set `CONVERTER_URL` in Vercel to
the converter base URL (for example `https://api.snookie.online` or `https://www.snookie.online` if
you configure a reverse proxy).

How it works on Vercel
1. Deploy the repo to Vercel (see steps below). The front-end will be served from `https://<your-site>`.
2. The front-end calls `/api/download?videoId=<id>` which is implemented in `api/download.js`.
3. `api/download.js` forwards that request to `CONVERTER_URL` (configure this in Vercel Environment Variables).
4. The converter service (hosted elsewhere) performs the heavy work (ffmpeg, yt-dlp) and returns the MP3 stream.

Setup & deploy to Vercel
1. Sign in to Vercel and create a new project by importing this GitHub repository.
2. In the Vercel Project Settings → Environment Variables add:
   - `CONVERTER_URL` = `https://your-converter-host.example` (where your converter is hosted)
3. Deploy. The site will be available at the Vercel domain provided.

Running locally (developer)
- The front-end can be served by any static server; to test the proxy locally, set `CONVERTER_URL` to your
  local converter (e.g. `http://localhost:3000`) when running serverless functions locally.

Notes and recommendations
- For production, configure a reverse proxy (Apache/Nginx) to proxy `/download` to your converter if
  you host the converter on the same machine. This avoids CORS and keeps everything same-origin.
- Do NOT commit large binaries (like `yt-dlp.exe`) or `node_modules` — they are excluded in `.gitignore`.
