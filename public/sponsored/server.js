// Express server for Threadline sponsored listings
// Requires: npm install express mongoose cors dotenv

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
console.log('CORS and JSON middleware enabled');


// Use the 'Threadline' database and 'rbxthread' collection inside 'sponsored'
const mongoUri = process.env.MONGO_URI || 'mongodb+srv://edmundbrady777_db_user:6GKQTa8IuQk4nUhu@threadline.jiqs2of.mongodb.net/Threadline?retryWrites=true&w=majority&appName=Threadline';

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: 'Threadline',
});

const ListingSchema = new mongoose.Schema({
  placeId: { type: String, required: true, unique: true },
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  title: { type: String, default: '' },
  likes: { type: Number, default: 0 },
  code: { type: String, required: true },
  thumbUrl: { type: String, default: '' },
}, { collection: 'rbxthread' });

const Listing = mongoose.model('Listing', ListingSchema, 'rbxthread');

// Get a random listing
app.get('/api/listings/random', async (req, res) => {
  try {
    const count = await Listing.countDocuments();
    if (count === 0) return res.status(404).json({ error: 'No listings found' });
    const random = Math.floor(Math.random() * count);
    const listing = await Listing.findOne().skip(random);
    res.json(listing);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Increment impressions or clicks
app.post('/api/listings/:placeId/increment', async (req, res) => {
  const { placeId } = req.params;
  const { field } = req.body; // 'impressions' or 'clicks'
  if (!['impressions', 'clicks'].includes(field)) return res.status(400).json({ error: 'Invalid field' });
  try {
    const listing = await Listing.findOneAndUpdate(
      { placeId },
      { $inc: { [field]: 1 } },
      { new: true }
    );
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    res.json(listing);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Add a new listing or update title/likes if exists
app.post('/api/listings', async (req, res) => {
  console.log('POST /api/listings body:', req.body);
  const { placeId, title, code, impressions, clicks } = req.body;
  if (!placeId) {
    console.log('Missing placeId in request');
    return res.status(400).json({ error: 'placeId required' });
  }
  if (!code) {
    console.log('Missing code in request');
    return res.status(400).json({ error: 'code required' });
  }
  try {
    // Fetch upVotes from Roblox API (using universeId)
    let likePercent = 0;
    let gameTitle = title || '';
    // 1. Get universeId from placeId
    let universeId = null;
    try {
      const universeRes = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
      if (universeRes.ok) {
        const universeData = await universeRes.json();
        universeId = universeData.universeId;
        console.log('Fetched universeId:', universeId, 'for placeId:', placeId);
      } else {
        console.error('Failed to fetch universeId. Status:', universeRes.status);
      }
    } catch (e) {
      console.error('Error fetching universeId:', e);
    }
    // 2. Get upVotes from votes API, game title, and icon from games API
    let thumbUrl = '';
    if (universeId) {
      // Fetch upVotes and downVotes from votes endpoint
      try {
        const votesRes = await fetch(`https://games.roblox.com/v1/games/${universeId}/votes`);
        if (votesRes.ok) {
          const votesData = await votesRes.json();
          console.log('Fetched votesData:', JSON.stringify(votesData));
          if (typeof votesData.upVotes === 'number' && typeof votesData.downVotes === 'number') {
            const totalVotes = votesData.upVotes + votesData.downVotes;
            if (totalVotes > 0) {
              likePercent = Math.round((votesData.upVotes / totalVotes) * 100);
            } else {
              likePercent = 0;
            }
            console.log('Calculated likePercent:', likePercent);
          } else {
            console.log('upVotes or downVotes not found in votesData:', votesData);
          }
        } else {
          console.error('Failed to fetch votes. Status:', votesRes.status);
        }
      } catch (e) {
        console.error('Error fetching votes from votes endpoint:', e);
      }
      // Fetch game title from games API
      try {
        const detailsRes = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
        if (detailsRes.ok) {
          const detailsData = await detailsRes.json();
          console.log('Fetched detailsData:', JSON.stringify(detailsData));
          const game = detailsData.data && detailsData.data[0] ? detailsData.data[0] : {};
          if (game.name) gameTitle = game.name;
        } else {
          console.error('Failed to fetch game details. Status:', detailsRes.status);
        }
      } catch (e) {
        console.error('Error fetching game title:', e);
      }
      // Fetch game icon from thumbnails API
      try {
        const iconRes = await fetch(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=150x150&format=Png&isCircular=false`);
        if (iconRes.ok) {
          const iconData = await iconRes.json();
          if (iconData.data && iconData.data[0] && iconData.data[0].imageUrl) {
            const url = iconData.data[0].imageUrl;
            // Only use if it's a real icon (150x150 and not a placeholder)
            if (url.includes('150/150') && !url.includes('noFilter')) {
              thumbUrl = url;
            } else {
              thumbUrl = '';
            }
          }
        }
      } catch (e) {
        console.error('Error fetching game icon:', e);
      }
    } else {
      console.log('universeId not found for placeId:', placeId);
    }
    // Only allow unique placeId per code, not globally
    let listing = await Listing.findOne({ placeId, code });
    if (listing) {
      if (gameTitle) listing.title = gameTitle;
      listing.likes = likePercent;
      if (code) listing.code = code;
      if (typeof impressions === 'number') listing.impressions = impressions;
      if (typeof clicks === 'number') listing.clicks = clicks;
      // Always update thumbUrl (even if empty string)
      listing.thumbUrl = thumbUrl || '';
      await listing.save();
      console.log('Updated listing in MongoDB:', listing);
      console.log(`Listing with placeId ${placeId} and code ${code} was UPDATED in MongoDB.`);
    } else {
      // Check if this user already has 5 listings
      const count = await Listing.countDocuments({ code });
      if (count >= 5) {
        return res.status(400).json({ error: 'You can only have 5 sponsored listings per code.' });
      }
      listing = await Listing.create({
        placeId,
        title: gameTitle,
        likes: likePercent,
        code,
        impressions: typeof impressions === 'number' ? impressions : 0,
        clicks: typeof clicks === 'number' ? clicks : 0,
        thumbUrl: thumbUrl || ''
      });
      console.log('Created new listing in MongoDB:', listing);
      console.log(`Listing with placeId ${placeId} and code ${code} was ADDED to MongoDB.`);
    }
    res.json(listing);
    console.log('POST /api/listings fulfilled successfully.');
  } catch (e) {
    console.error('Error in POST /api/listings:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get all listings (for admin/debug)
// Get listings filtered by code or placeId
app.get('/api/listings', async (req, res) => {
  try {
    const { code, placeId } = req.query;
    let query = {};
    if (code) query.code = code;
    if (placeId) query.placeId = placeId;
    const listings = await Listing.find(query);
    res.json(listings);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete a listing by code and placeId
app.delete('/api/listings', async (req, res) => {
  const { code, placeId } = req.query;
  if (!code || !placeId) return res.status(400).json({ error: 'code and placeId required' });
  try {
    const result = await Listing.deleteOne({ code, placeId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`Threadline API listening on port ${PORT}`);
});
