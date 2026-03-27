
// Polyfill fetch for Node.js if not available
if (typeof fetch === 'undefined') {
  global.fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
}

// Vercel Serverless API for Threadline sponsored listings
// Place this file as /api/listings.js

const mongoose = require('mongoose');

// Use the 'Threadline' database and 'rbxthread' collection inside 'sponsored'
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  throw new Error('MONGO_URI environment variable must be set');
}

let conn = null;
async function connectToDatabase() {
  if (conn) return conn;
  conn = await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: 'Threadline',
  });
  return conn;
}

const ListingSchema = new mongoose.Schema({
  placeId: { type: String, required: true, unique: true },
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  title: { type: String, default: '' },
  likes: { type: Number, default: 0 },
  code: { type: String, required: true },
    author: { type: String, default: '' },
    thumbUrl: { type: String, default: '' },
  }, { collection: 'rbxthread' });

const Listing = mongoose.models.Listing || mongoose.model('Listing', ListingSchema, 'rbxthread');

async function handler(req, res) {

  await connectToDatabase();
  const method = req.method;
  const { placeId } = req.query;

  // Robust JSON body parsing for Vercel/Node.js
  if (method === 'POST' && !req.body) {
    try {
      const rawBody = await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
        req.on('error', reject);
      });
      req.body = rawBody ? JSON.parse(rawBody) : {};
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  if (req.url.endsWith('/random') && method === 'GET') {
    // Get a random listing
    try {
      const count = await Listing.countDocuments();
      if (count === 0) return res.status(404).json({ error: 'No listings found' });
      const random = Math.floor(Math.random() * count);
      const listing = await Listing.findOne().skip(random);
      return res.json(listing);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.url.match(/\/api\/listings\/[\w-]+\/increment$/) && method === 'POST') {
    // Increment impressions or clicks
    const placeId = req.query.placeId || req.url.split('/')[3];
    const { field } = req.body;
    if (!['impressions', 'clicks'].includes(field)) return res.status(400).json({ error: 'Invalid field' });
    try {
      const listing = await Listing.findOneAndUpdate(
        { placeId },
        { $inc: { [field]: 1 } },
        { new: true }
      );
      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      return res.json(listing);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (method === 'POST') {
    // Debug log for POST body
    console.log('POST body:', req.body);
    // Add a new listing or update title/author/thumb/likes if exists
    const { placeId, title, code, impressions, clicks } = req.body;
    if (!placeId) return res.status(400).json({ error: 'placeId required' });
    if (!code) return res.status(400).json({ error: 'code required' });
    // Validate placeId format (6-12 digits)
    if (!/^\d{6,12}$/.test(placeId)) {
      return res.status(400).json({ error: 'Invalid placeId format.' });
    }
    try {
      // Fetch Roblox game details using multiget endpoint
      let gameTitle = title || '';
      let author = '';
      let thumbUrl = '';
      let likePercent = 0;
      let universeId = null;
      let validGame = false;
      try {
        const detailsRes = await fetch(`https://games.roblox.com/v1/games/multiget-place-details?placeIds=${placeId}`);
        if (detailsRes.ok) {
          const detailsData = await detailsRes.json();
          if (Array.isArray(detailsData) && detailsData[0] && detailsData[0].name) {
            const game = detailsData[0];
            gameTitle = game.name || gameTitle;
            author = (game.builder && game.builder.name) ? game.builder.name : '';
            universeId = game.universeId;
            validGame = true;
          }
        }
      } catch {}
      // If no valid game, return error
      if (!validGame) {
        return res.status(400).json({ error: 'Invalid or private placeId, or Roblox API returned no data.' });
      }
      // Fetch thumbnail (use place THUMBNAIL endpoint, not icon)
      try {
        const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/places/${placeId}/thumbnails?format=Png&size=768x432`);
        if (thumbRes.ok) {
          const thumbData = await thumbRes.json();
          // Debug log
          console.log('Roblox thumbnail API response:', JSON.stringify(thumbData));
          if (thumbData.data && thumbData.data[0] && thumbData.data[0].imageUrl) {
            thumbUrl = thumbData.data[0].imageUrl;
          }
        } else {
          console.log('Roblox thumbnail API failed:', thumbRes.status);
        }
      } catch (err) {
        console.log('Roblox thumbnail API error:', err);
      }
      // Fetch like percent
      if (universeId) {
        try {
          const votesRes = await fetch(`https://games.roblox.com/v1/games/${universeId}/votes`);
          if (votesRes.ok) {
            const votesData = await votesRes.json();
            if (typeof votesData.upVotes === 'number' && typeof votesData.downVotes === 'number') {
              const totalVotes = votesData.upVotes + votesData.downVotes;
              likePercent = totalVotes > 0 ? Math.round((votesData.upVotes / totalVotes) * 100) : 0;
            }
          }
        } catch {}
      }
      // Only save if we have at least title, author, and thumbUrl
      if (!gameTitle || !author || !thumbUrl) {
        return res.status(400).json({ error: 'Could not fetch all required Roblox data (title, author, thumbnail).' });
      }
      let listing = await Listing.findOne({ placeId, code });
      if (listing) {
        listing.title = gameTitle;
        listing.author = author;
        listing.thumbUrl = thumbUrl;
        listing.likes = likePercent;
        if (code) listing.code = code;
        if (typeof impressions === 'number') listing.impressions = impressions;
        if (typeof clicks === 'number') listing.clicks = clicks;
        await listing.save();
      } else {
        const count = await Listing.countDocuments({ code });
        if (count >= 5) return res.status(400).json({ error: 'You can only have 5 sponsored listings per code.' });
        listing = await Listing.create({
          placeId,
          title: gameTitle,
          likes: likePercent,
          code,
          impressions: typeof impressions === 'number' ? impressions : 0,
          clicks: typeof clicks === 'number' ? clicks : 0,
          author,
          thumbUrl
        });
      }
      return res.json(listing);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (method === 'GET') {
    // Get all listings (for admin/debug) or filtered by code/placeId
    try {
      const { code, placeId } = req.query;
      let query = {};
      if (code) query.code = code;
      if (placeId) query.placeId = placeId;
      const listings = await Listing.find(query);
      // Attach author and thumbUrl if missing (for legacy entries)
      const listingsWithMeta = await Promise.all(listings.map(async (entry) => {
        let updated = false;
        if (!entry.author || !entry.thumbUrl || !entry.title || typeof entry.likes !== 'number') {
          // Fetch Roblox info
          try {
            const detailsRes = await fetch(`https://games.roblox.com/v1/games/multiget-place-details?placeIds=${entry.placeId}`);
            if (detailsRes.ok) {
              const detailsData = await detailsRes.json();
              if (Array.isArray(detailsData) && detailsData[0]) {
                const game = detailsData[0];
                if (game.name && !entry.title) { entry.title = game.name; updated = true; }
                if (game.builder && game.builder.name && !entry.author) { entry.author = game.builder.name; updated = true; }
                if (game.universeId && (typeof entry.likes !== 'number' || entry.likes === 0)) {
                  // Fetch like percent
                  try {
                    const votesRes = await fetch(`https://games.roblox.com/v1/games/${game.universeId}/votes`);
                    if (votesRes.ok) {
                      const votesData = await votesRes.json();
                      if (typeof votesData.upVotes === 'number' && typeof votesData.downVotes === 'number') {
                        const totalVotes = votesData.upVotes + votesData.downVotes;
                        entry.likes = totalVotes > 0 ? Math.round((votesData.upVotes / totalVotes) * 100) : 0;
                        updated = true;
                      }
                    }
                  } catch {}
                }
              }
            }
          } catch {}
          // Fetch thumbnail
          try {
            const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/places/${entry.placeId}/icons?format=Png&isCircular=false&size=150x150`);
            if (thumbRes.ok) {
              const thumbData = await thumbRes.json();
              if (thumbData.data && thumbData.data[0] && thumbData.data[0].imageUrl) {
                entry.thumbUrl = thumbData.data[0].imageUrl;
                updated = true;
              }
            }
          } catch {}
          if (updated) await entry.save();
        }
        return entry;
      }));
      return res.json(listingsWithMeta);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (method === 'DELETE') {
    // Delete a listing by code and placeId
    const { code, placeId } = req.query;
    if (!code || !placeId) return res.status(400).json({ error: 'code and placeId required' });
    try {
      const result = await Listing.deleteOne({ code, placeId });
      if (result.deletedCount === 0) return res.status(404).json({ error: 'Listing not found' });
      return res.json({ success: true, deletedCount: result.deletedCount });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Not found
  return res.status(404).json({ error: 'Not found' });
}

export default handler;
