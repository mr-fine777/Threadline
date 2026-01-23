// Vercel custom server entry point for Express
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3200;

// Serve static files from public
app.use(express.static(path.join(__dirname, '../public')));

// Serve api/ingame.clothing for avatar assets
app.use('/api/ingame.clothing', express.static(path.join(__dirname, 'ingame.clothing')));

// Serve api/ava for direct HTML access
app.use('/api/ava', express.static(path.join(__dirname, 'ava')));

// Add your API routes here (example)
// app.get('/api/hello', (req, res) => res.json({ message: 'Hello from Express!' }));

// Fallback: send index.html for unknown routes (optional, for SPA)
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, '../public/index.html'));
// });

app.listen(PORT, () => {
  console.log(`Express server running at http://localhost:${PORT}`);
});
