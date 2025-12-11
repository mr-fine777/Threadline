module.exports = (req, res) => {
  const converter = process.env.CONVERTER_URL || null;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({
    ok: true,
    converterConfigured: Boolean(converter),
    converter: converter ? (converter.length > 40 ? converter.slice(0, 20) + '...' : converter) : null
  }));
};
