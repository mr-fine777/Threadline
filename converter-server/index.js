const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const ytdl = require('ytdl-core');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
// Allowed origin for CORS (set via env or default to your production domain)
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://www.snookie.online';

// Basic CORS + preflight handling for the download endpoint
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // If you need credentials (cookies), set to true and adjust client-side
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Converter server running. Use /download?videoId=<id>');
});

// Stream an MP3 at 128kbps for a given YouTube videoId
app.get('/download', async (req, res) => {
  try {
    const videoId = (req.query.videoId || '').toString();
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      return res.status(400).send('Invalid or missing videoId');
    }

    const url = `https://www.youtube.com/watch?v=${videoId}`;

    // Allow cross-origin HEAD checks from the UI and set download headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${videoId}.mp3"`);

    // If client is only probing with HEAD, return headers and don't start conversion
    if (req.method === 'HEAD') {
      return res.status(200).end();
    }

    // Strategy: try to use system `yt-dlp` (most reliable). If not available or it fails,
    // fall back to `ytdl-core` stream. We spawn `yt-dlp -f bestaudio -o -` and pipe stdout
    // to ffmpeg for mp3 conversion.
    let usedSource = 'none';
    let audioStream = null;

    // Helper to start ffmpeg from a readable stream
    const startFfmpeg = (stream) => {
      return ffmpeg(stream)
      .audioBitrate(128)
      .format('mp3')
      .on('start', (cmdline) => {
        console.log('FFmpeg started:', cmdline);
      })
      .on('error', (err, stdout, stderr) => {
        console.error('Conversion error', err.message);
        if (!res.headersSent) {
          res.status(500).send('Conversion failed');
        } else {
          // If headers already sent, just end the response
          try { res.end(); } catch (e) {}
        }
      })
      .on('end', () => {
        console.log('Conversion finished for', videoId);
      })
      .pipe(res, { end: true });

    };

    // Try system yt-dlp first
    try {
      // Prefer a local yt-dlp executable in the server folder if present (yt-dlp.exe on Windows)
      const localExe = path.join(__dirname, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
      const cmd = fs.existsSync(localExe) ? localExe : 'yt-dlp';
      const ytdlp = spawn(cmd, ['-f', 'bestaudio', '-o', '-', '--no-playlist', url], { stdio: ['ignore', 'pipe', 'pipe'] });
      ytdlp.stderr.on('data', (c) => console.error('[yt-dlp]', c.toString()));

      ytdlp.on('error', (err) => {
        // Likely ENOENT (not installed) or spawn error — fallback below
        console.warn('yt-dlp spawn error, falling back to ytdl-core:', err && err.code ? err.code : err);
      });

      // Give yt-dlp a short chance to produce output; if stdout becomes readable we use it.
      let started = false;
      ytdlp.stdout.once('readable', () => {
        started = true;
        usedSource = 'yt-dlp';
        audioStream = ytdlp.stdout;
        const proc = startFfmpeg(audioStream);

        req.on('close', () => {
          try { ytdlp.kill('SIGKILL'); } catch (e) {}
          try { if (proc && proc.kill) proc.kill('SIGKILL'); } catch (e) {}
        });
      });

      // If yt-dlp exits early without producing data, fallback
      ytdlp.on('close', (code) => {
        if (!started) {
          console.warn('yt-dlp exited without output, falling back to ytdl-core (code='+code+')');
          // fall through to ytdl-core below
          tryFallbackToYtdl();
        }
      });
    } catch (err) {
      console.warn('yt-dlp attempt failed:', err);
      tryFallbackToYtdl();
    }

    // Fallback function to use ytdl-core if yt-dlp isn't available or fails
    function tryFallbackToYtdl() {
      if (usedSource !== 'none') return; // already started
      try {
        const ytdlStream = ytdl(url, { quality: 'highestaudio', filter: 'audioonly', highWaterMark: 1 << 25 });
        usedSource = 'ytdl-core';
        audioStream = ytdlStream;
        const proc = startFfmpeg(audioStream);

        req.on('close', () => {
          try { ytdlStream.destroy(); } catch (e) {}
          try { if (proc && proc.kill) proc.kill('SIGKILL'); } catch (e) {}
        });
      } catch (err) {
        console.error('Fallback ytdl-core error', err && err.message ? err.message : err);
        if (!res.headersSent) res.status(502).send('Could not fetch audio stream');
      }
    }
  } catch (err) {
    console.error('Server error', err);
    res.status(500).send('Server error');
  }
});

app.listen(PORT, () => console.log(`Converter server listening on https://www.snookie.online:${PORT}`));
