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
	await connectToDatabase();
	let placeId = req.query.placeId || req.query.PLACEID || req.query.id;
	if (!placeId && req.url.includes('?')) {
	  const query = req.url.split('?')[1];
	  if (query && !query.includes('=')) {
	    placeId = query;
	  } else if (query && query.includes('=')) {
	    placeId = query.split('=')[1];
	  }
	}
	if (!placeId) return res.status(400).json({ error: 'Missing placeId' });
	try {
		const listing = await Listing.findOneAndUpdate(
			{ placeId },
			{ $inc: { impressions: 1 } },
			{ new: true }
		);
		if (!listing) return res.status(404).json({ error: 'Listing not found' });
		return res.json({ success: true, impressions: listing.impressions });
	} catch (e) {
		return res.status(500).json({ error: e.message });
	}
}

export default handler;
