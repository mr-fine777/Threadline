

// Polyfill fetch for Node.js if not available
if (typeof fetch === 'undefined') {
  global.fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
}

const mongoose = require('mongoose');

const mongoUri = process.env.MONGO_URI;

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
}, { collection: 'rbxthread' });

const Listing = mongoose.models.Listing || mongoose.model('Listing', ListingSchema, 'rbxthread');

async function handler(req, res) {
  await connectToDatabase();
  // DEBUG: Log incoming request method and url
  console.log('[API] listings.js', method, req.url, req.body || req.query);
  const method = req.method;
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

  // GET /api/listings/random
  if (req.url.endsWith('/random') && method === 'GET') {
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

  // POST /api/listings/:placeId/increment
  if (req.url.match(/\/api\/listings\/[\w-]+\/increment$/) && method === 'POST') {
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

  // POST /api/listings
  if (method === 'POST') {
    const { placeId, code, impressions, clicks } = req.body;
    console.log('[API][POST] Incoming body:', req.body);
    if (!placeId) return res.status(400).json({ error: 'placeId required' });
    if (!code) return res.status(400).json({ error: 'code required' });
    try {
      let likePercent = 0;
      let gameTitle = '';
      let author = '';
      let thumbUrl = '';
      let universeId = null;
      // 1. Get universeId from placeId
      try {
        const universeRes = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
        if (universeRes.ok) {
          const universeData = await universeRes.json();
          universeId = universeData.universeId;
        }
      } catch (e) {}
      // 2. Get upVotes, game title, author, and thumbnail
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
        } catch (e) {}
        try {
          const detailsRes = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
          if (detailsRes.ok) {
            const detailsData = await detailsRes.json();
            const game = detailsData.data && detailsData.data[0] ? detailsData.data[0] : {};
            if (game.name) gameTitle = game.name;
            if (game.creator && game.creator.name) author = game.creator.name;
          }
        } catch (e) {}
        try {
          const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeId}&size=768x432&format=Png&isCircular=false`);
          if (thumbRes.ok) {
            const thumbData = await thumbRes.json();
            thumbUrl = thumbData && thumbData.data && thumbData.data[0]?.thumbnails[0]?.imageUrl || '';
          }
        } catch (e) {}
      }
      // Only allow unique placeId per code, not globally
      let listing = await Listing.findOne({ placeId, code });
      console.log('[API][POST] Fetched listing:', listing);
      if (listing) {
        if (gameTitle) listing.title = gameTitle;
        listing.likes = likePercent;
        listing.author = author;
        listing.thumbUrl = thumbUrl;
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
      console.log('[API][POST] Saved/created listing:', listing);
      return res.json(listing);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // GET /api/listings (all, or filtered by code/placeId)
  if (method === 'GET') {
    try {
      const { code, placeId } = req.query;
      let query = {};
      if (code) query.code = code;
      if (placeId) query.placeId = placeId;
      console.log('[API][GET] Query:', query);
      const listings = await Listing.find(query);
      console.log('[API][GET] Results:', listings);
      return res.json(listings);
    } catch (e) {
      console.error('[API][GET] Error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  // DELETE /api/listings
  if (method === 'DELETE') {
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
