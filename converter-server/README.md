Converter Server (YouTube -> MP3)
=================================

This small Express server streams YouTube audio and converts it to MP3 (128kbps) on the fly.

Install and run (PowerShell):

```powershell
cd c:\xampp\htdocs\converter-server
npm install
npm start
```

The server exposes:
- `GET /` - status message
- `GET /download?videoId=<youtubeId>` - returns an MP3 attachment streamed from YouTube

Notes:
- `ffmpeg-static` is used, so you don't need to install ffmpeg separately on most platforms.
- This approach relies on `ytdl-core`. Some YouTube videos may not be downloadable due to restrictions.
- Use responsibly and respect YouTube's Terms of Service.
