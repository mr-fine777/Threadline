// Basic Express server for static file serving
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3200;

// Serve static files from the root and public folders
app.use(express.static(path.join(__dirname, '../')));
app.use('/public', express.static(path.join(__dirname, '../public')));

// Serve api/ingame.clothing for avatar assets
app.use('/api/ingame.clothing', express.static(path.join(__dirname, 'ingame.clothing')));

// Serve api/ava for direct HTML access
app.use('/api/ava', express.static(path.join(__dirname, 'ava')));

// Fallback: send index.html for unknown routes (optional, for SPA)
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'ava/avatar-corrector.html'));
// });

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/api/ava/avatar-corrector.html`);
});
