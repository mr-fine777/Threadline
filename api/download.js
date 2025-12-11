// api/download.js
// Simple serverless proxy that forwards /api/download?videoId=... to the
// external converter service defined by the CONVERTER_URL environment variable.

const URL = require('url');

module.exports = async (req, res) => {
  try {
    const parsed = URL.parse(req.url, true);
    const videoId = parsed.query && parsed.query.videoId;
    if (!videoId) {
      res.statusCode = 400;
      res.end('Missing videoId');
      return;
    }

    const converterBase = process.env.CONVERTER_URL;
    if (!converterBase) {
      console.error('CONVERTER_URL not set');
      res.statusCode = 502;
      res.end('Converter not configured. Set CONVERTER_URL in Vercel environment variables.');
      return;
    }

    // Build target URL and validate
    let target;
    try {
      target = new URL(`/download?videoId=${encodeURIComponent(videoId)}`, converterBase).toString();
    } catch (err) {
      console.error('Invalid CONVERTER_URL:', converterBase, err);
      res.statusCode = 500;
      res.end('Invalid CONVERTER_URL configuration');
      return;
    }

    // Use global fetch available in Vercel runtime
    const fetchOpts = { method: req.method || 'GET', headers: {} };
    // Forward a minimal set of headers
    if (req.headers['user-agent']) fetchOpts.headers['user-agent'] = req.headers['user-agent'];
    if (req.headers['accept']) fetchOpts.headers['accept'] = req.headers['accept'];

    // For HEAD requests we just proxy HEAD
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    fetchOpts.signal = controller.signal;

    const upstream = await fetch(target, fetchOpts).catch((err) => {
      clearTimeout(timeout);
      console.error('Fetch to converter failed:', err && err.message);
      throw err;
    });
    clearTimeout(timeout);

    // Forward status and headers
    res.statusCode = upstream.status || 502;
    try {
      // Use entries() to safely iterate headers in all runtimes
      for (const [name, value] of upstream.headers.entries()) {
        const lower = name.toLowerCase();
        if (['transfer-encoding', 'content-encoding', 'content-length'].includes(lower)) continue;
        res.setHeader(name, value);
      }
    } catch (hdrErr) {
      console.warn('Could not iterate upstream headers, falling back to forEach if available', hdrErr && hdrErr.message);
      if (typeof upstream.headers.forEach === 'function') {
        upstream.headers.forEach((value, name) => {
          const lower = name.toLowerCase();
          if (['transfer-encoding', 'content-encoding', 'content-length'].includes(lower)) return;
          res.setHeader(name, value);
        });
      }
    }

    // If upstream returned no body (e.g., HEAD), end here
    if (!upstream.body) {
      res.end();
      return;
    }

    // Stream body to response
    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      // value is a Uint8Array
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (err) {
    console.error('Proxy error:', err && err.message);
    if (err && err.name === 'AbortError') {
      res.statusCode = 504;
      res.end('Gateway timeout contacting converter');
    } else {
      res.statusCode = 502;
      res.end('Bad Gateway: ' + String(err && err.message));
    }
  }
};
