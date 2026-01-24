const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the static UI from src/static at root
const staticPath = path.join(__dirname, 'src', 'static');
app.use('/', express.static(staticPath));

// Simple helper: a tiny placeholder PNG (1x1 transparent) in base64
const PLACEHOLDER_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=';

// POST /api/download - proxy to Python backend if reachable, otherwise return placeholder PNG
app.post('/api/download', async (req, res) => {
  const clothing = (req.body && req.body.clothing) || req.query.clothing;
  if (!clothing) {
    return res.status(400).json({ error: "Please provide 'clothing' in the request body." });
  }

  // In production (Vercel), the Python backend is at the same host
  const pythonUrl = process.env.VERCEL ? '/api/download' : 'http://127.0.0.1:5000/api/download';
  try {
    const proxied = await fetch(pythonUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clothing })
    });

    if (proxied.ok) {
      // If Python returned an image, pipe it through
      const contentType = proxied.headers.get('content-type') || 'application/octet-stream';
      const disposition = proxied.headers.get('content-disposition') || `attachment; filename="${clothing.replace(/[^0-9]/g,'') || 'download'}.png"`;
      const arrayBuf = await proxied.arrayBuffer();
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', disposition);
      return res.status(200).send(Buffer.from(arrayBuf));
    }
    // If proxied returned a non-OK status and JSON body, forward it to the client
    const contentType = proxied.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const errBody = await proxied.json();
        res.status(proxied.status).json(errBody);
        return;
      } catch (err) {
        console.warn('Failed to parse JSON error from Python backend:', err.message || err);
      }
    }

    // If proxied returned a non-OK status and not JSON (or parsing failed), fallthrough to placeholder
    console.warn('Python backend returned non-OK status:', proxied.status);
  } catch (err) {
    // Backend not available or failed - log and return placeholder
    console.warn('Could not reach Python backend at', pythonUrl, '— serving placeholder instead. Error:', err.message || err);
  }

  // Return placeholder PNG so the UI can still download something while offline
  const buf = Buffer.from(PLACEHOLDER_PNG_BASE64, 'base64');
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', `attachment; filename="${clothing.replace(/[^0-9]/g,'') || 'download'}.png"`);
  return res.status(200).send(buf);
});

// Catch-all for 404 on missing static files
app.use((req, res, next) => {
  if (req.accepts('html')) {
    return res.status(404).send('<h1>Not Found</h1><p>The requested URL was not found on this server.</p>');
  }
  return res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Local server running: http://localhost:${PORT}/`);
  console.log('Serving static UI from:', staticPath);
  console.log('POST /api/download will proxy to http://127.0.0.1:5000/api/download if available, otherwise returns a placeholder PNG.');
});
