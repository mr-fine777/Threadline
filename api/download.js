const https = require('https');
const http = require('http');
const url = require('url');

module.exports = async (req, res) => {
  const query = req.query || url.parse(req.url, true).query;
  const videoId = query.videoId;

  if (!videoId) {
    res.statusCode = 400;
    res.end('Missing videoId');
    return;
  }

  const converterBase = process.env.CONVERTER_URL;
  if (!converterBase) {
    res.statusCode = 500;
    res.end('Converter not configured');
    return;
  }

  const target = new URL(`/download?videoId=${encodeURIComponent(videoId)}`, converterBase);
  const httpLib = target.protocol === 'https:' ? https : http;

  const options = {
    method: req.method || 'GET',
    headers: Object.assign({}, req.headers)
  };

  // Forward request to converter
  const proxied = httpLib.request(target, options, (converterRes) => {
    res.statusCode = converterRes.statusCode || 200;
    Object.entries(converterRes.headers || {}).forEach(([k, v]) => {
      // Don't leak hop-by-hop headers
      if ([ 'transfer-encoding', 'content-encoding' ].includes(k.toLowerCase())) return;
      res.setHeader(k, v);
    });

    converterRes.pipe(res);
  });

  proxied.on('error', (err) => {
    res.statusCode = 502;
    res.end('Bad Gateway: ' + String(err.message));
  });

  // If original request has a body, pipe it
  req.pipe(proxied);
};
const URL = require('url');

module.exports = async (req, res) => {
  try {
    const query = URL.parse(req.url, true).query || {};
    const videoId = query.videoId;
    if (!videoId) {
      res.statusCode = 400;
      res.end('Missing videoId');
      return;
    }

    const converterBase = process.env.CONVERTER_URL || 'http://localhost:3000';
    const target = `${converterBase.replace(/\/$/, '')}/download?videoId=${encodeURIComponent(videoId)}`;

    // Forward the request to the external converter service and pipe response back
    const fetched = await fetch(target, { method: req.method, headers: { 'accept': req.headers.accept || '*/*' } });

    // Forward status and headers
    res.statusCode = fetched.status;
    fetched.headers.forEach((value, name) => {
      // Avoid exposing internal server headers
      if (name.toLowerCase() === 'transfer-encoding') return;
      res.setHeader(name, value);
    });

    // Stream the body
    const reader = fetched.body.getReader();
    const encoder = new TextEncoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (err) {
    console.error('Proxy error', err);
    res.statusCode = 502;
    res.end('Proxy error');
  }
};
