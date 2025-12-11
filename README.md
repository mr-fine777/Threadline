snookie.online
================

Small static front-end that proxies a YouTube -> MP3 conversion to a local Express converter.

Structure
- `index.html`, `styles.css` — front-end UI
- `converter-server/` — Node/Express server that streams YouTube audio and converts to MP3
- `ytmp3_files/` — downloaded frontend files (optional)

Install & run (server)
1. Open PowerShell and install dependencies:

```powershell
cd C:\xampp\htdocs\converter-server
npm install
```

2. Start the converter server:

```powershell
npm start
```

Usage
- Open `index.html` in the browser (served from your local webroot e.g. `http://localhost/`) and paste a YouTube URL.
- Press Convert (or ENTER). The page will call `http://localhost:3000/download?videoId=<id>` to initiate download.

Notes
- Do not commit `node_modules` or `yt-dlp.exe` (they are in `.gitignore`).
- If you want deterministic downloads and better reliability, install `yt-dlp` on the server host (or keep `yt-dlp.exe` in `converter-server/`).
