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
  placeId: { type: String, required: true, unique: false },
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
  // --- CORS headers for all responses ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request immediately
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Only connect to DB for GET
  await connectToDatabase();
  try {
    const count = await Listing.countDocuments();
    if (count === 0) return res.status(404).json({ error: 'No listings found' });
    // Get 5 random listings
    const randomIndexes = [];
    while (randomIndexes.length < 5 && randomIndexes.length < count) {
      const rand = Math.floor(Math.random() * count);
      if (!randomIndexes.includes(rand)) randomIndexes.push(rand);
    }
    const listings = [];
    for (const idx of randomIndexes) {
      const listing = await Listing.findOne().skip(idx);
      if (listing) listings.push(listing);
    }
    return res.json(listings);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

export default handler;
