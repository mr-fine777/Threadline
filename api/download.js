// api/download.js
// Simple serverless proxy that forwards /api/download?videoId=... to the
// external converter service defined by the CONVERTER_URL environment variable.

const urlLib = require('url');

module.exports = async (req, res) => {
  try {
    const parsed = urlLib.parse(req.url, true);
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
      // Use the global URL constructor (not the node 'url' module object)
      target = new globalThis.URL(`/download?videoId=${encodeURIComponent(videoId)}`, converterBase).toString();
    } catch (err) {
      console.error('Invalid CONVERTER_URL or failed to build target URL:', converterBase, err && err.message);
      res.statusCode = 500;
      res.end('Invalid CONVERTER_URL configuration');
      return;
    }

    // Use global fetch available in Vercel runtime
    const fetchOpts = { method: req.method || 'GET', headers: {} };
    // Forward a minimal set of headers
    if (req.headers['user-agent']) fetchOpts.headers['user-agent'] = req.headers['user-agent'];
    if (req.headers['accept']) fetchOpts.headers['accept'] = req.headers['accept'];

    const inspect = parsed.query && parsed.query.inspect === '1';

    // Diagnostic mode: return upstream status/headers/body snippet as JSON
    if (inspect) {
      try {
        const controllerDiag = new AbortController();
        const timeoutDiag = setTimeout(() => controllerDiag.abort(), 30_000);
        fetchOpts.signal = controllerDiag.signal;
        const up = await fetch(target, fetchOpts).catch((err) => {
          clearTimeout(timeoutDiag);
          console.error('Inspect fetch failed:', err && err.message, err && err.name, err && err.code);
          throw err;
        });
        clearTimeout(timeoutDiag);

        const headers = {};
        try {
          for (const [k, v] of up.headers.entries()) headers[k] = v;
        } catch (e) {
          if (typeof up.headers.forEach === 'function') up.headers.forEach((v, k) => (headers[k] = v));
        }

        let bodySnippet = null;
        try {
          if (up.body) {
            const reader = up.body.getReader();
            const { done, value } = await reader.read();
            if (!done && value) {
              const asStr = Buffer.from(value).toString('utf8');
              bodySnippet = asStr.slice(0, 1024);
            }
          } else {
            bodySnippet = null;
          }
        } catch (e) {
          bodySnippet = `<<could not read body: ${e && e.message}>>`;
        }

        const maskedConverter = converterBase ? (converterBase.length > 60 ? converterBase.slice(0, 30) + '...' + converterBase.slice(-10) : converterBase) : null;
        res.setHeader('content-type', 'application/json');
        res.statusCode = up.status || 200;
        res.end(JSON.stringify({ ok: true, upstreamStatus: up.status, converter: maskedConverter, target, headers, bodySnippet }));
        return;
      } catch (err) {
        console.error('Inspect mode error:', err && err.message, err && err.name, err && err.code);
        const stack = err && err.stack ? String(err.stack).split('\n').slice(0,3).join('\n') : null;
        res.setHeader('content-type', 'application/json');
        res.statusCode = err && err.name === 'AbortError' ? 504 : 502;
        const maskedConverterErr = converterBase ? (converterBase.length > 60 ? converterBase.slice(0, 30) + '...' + converterBase.slice(-10) : converterBase) : null;
        res.end(JSON.stringify({ ok: false, error: String(err && err.message), name: err && err.name, code: err && err.code, stackSnippet: stack, converter: maskedConverterErr, target }));
        return;
      }
    }

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
