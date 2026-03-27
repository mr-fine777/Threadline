
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
    // Add a new listing or update title/likes if exists
    const { placeId, title, code, impressions, clicks } = req.body;
    if (!placeId) return res.status(400).json({ error: 'placeId required' });
    if (!code) return res.status(400).json({ error: 'code required' });
    try {
      let likePercent = 0;
      let gameTitle = title || '';
      let universeId = null;
      try {
        const universeRes = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
        if (universeRes.ok) {
          const universeData = await universeRes.json();
          universeId = universeData.universeId;
        }
      } catch {}
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
        try {
          const detailsRes = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
          if (detailsRes.ok) {
            const detailsData = await detailsRes.json();
            const game = detailsData.data && detailsData.data[0] ? detailsData.data[0] : {};
            if (game.name) gameTitle = game.name;
          }
        } catch {}
      }
      let listing = await Listing.findOne({ placeId, code });
      if (listing) {
        if (gameTitle) listing.title = gameTitle;
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
          clicks: typeof clicks === 'number' ? clicks : 0
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
      return res.json(listings);
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
