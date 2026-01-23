// Vercel-compatible Node.js API endpoint for asset download
const { RobloxAssetDownloader } = require('../../src/roblox_asset_downloader');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
  res.status(405).json({ error: 'Method not allowed' });
  return;
  }
  const clothing = req.body?.clothing || req.query?.clothing;
  if (!clothing) {
  res.status(400).json({ error: "Please provide clothing id or url in field 'clothing'" });
  return;
  }
  try {
  const downloader = new RobloxAssetDownloader();
  await downloader.processAsset(clothing);
  const assetId = String(clothing).replace(/[^0-9]/g, '');
  if (!assetId) {
  res.status(400).json({ error: 'Could not determine numeric asset id from input' });
  return;
  }
  const path = require('path');
  const fs = require('fs');
  const downloadsDir = process.env.DOWNLOADS_DIR || path.join(__dirname, '../../downloads');
  const filePath = path.join(downloadsDir, `${assetId}.png`);
  if (!fs.existsSync(filePath)) {
  res.status(500).json({ error: 'Download finished but output file not found' });
  return;
  }
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', `attachment; filename=${assetId}.png`);
  fs.createReadStream(filePath).pipe(res);
  } catch (e) {
  res.status(500).json({ error: 'Internal server error' });
  }
};
const fetch = require('node-fetch');

// Simple helper: a tiny placeholder PNG (1x1 transparent) in base64
const PLACEHOLDER_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=';

module.exports = async (req, res) => {
  const clothing = (req.body && req.body.clothing) || (req.query && req.query.clothing);
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
};
