const express = require('express');
const router  = express.Router();


const { authRequired } = require('../middleware/auth');

// Get Google Maps API key from .env

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// ─── REGION NAMES ─────────────────────────────────────────────────────────

const regionNames = [
  { id: 'soweto',      name: 'Soweto, Johannesburg',      emoji: '🏘️', pickers: 64, kg: 4210, target: 5400, depots: 3, status: 'warning', color: '#F59E0B' },
  { id: 'alexandra',   name: 'Alexandra, Johannesburg',   emoji: '🌇', pickers: 41, kg: 3140, target: 4800, depots: 2, status: 'warning', color: '#F59E0B' },
  { id: 'germiston',   name: 'Germiston, Johannesburg',   emoji: '🏭', pickers: 58, kg: 5620, target: 5500, depots: 4, status: 'good',    color: '#2E7D32' },
  { id: 'tembisa',     name: 'Tembisa, Johannesburg',     emoji: '🌿', pickers: 37, kg: 2870, target: 5300, depots: 2, status: 'alert',   color: '#E53935' },
  { id: 'diepsloot',   name: 'Diepsloot, Johannesburg',   emoji: '🏡', pickers: 28, kg: 1840, target: 3200, depots: 1, status: 'good',    color: '#2E7D32' },
  { id: 'orange-farm', name: 'Orange Farm, Johannesburg', emoji: '🌾', pickers: 19, kg: 792,  target: 2000, depots: 2, status: 'alert',   color: '#E53935' },
];

const depots = [
  { name: 'Soweto Main Depot',  lat: -26.272, lng: 27.870, capacity: '12t', today: '3.2t' },
  { name: 'Germiston Central',  lat: -26.225, lng: 28.175, capacity: '18t', today: '5.6t' },
  { name: 'Alexandra Depot',    lat: -26.110, lng: 28.103, capacity: '8t',  today: '2.1t' },
  { name: 'Tembisa East',       lat: -26.002, lng: 28.235, capacity: '10t', today: '1.8t' },
  { name: 'Diepsloot North',    lat: -25.940, lng: 28.020, capacity: '6t',  today: '0.9t' },
  { name: 'Orange Farm Depot',  lat: -26.490, lng: 27.910, capacity: '7t',  today: '0.4t' },
];

// ─── CACHE ────────────────────────────────────────────────────────────────

let cachedRegions = null;
let cacheTime     = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// ─── HELPER: FETCH COORDINATES FROM GOOGLE MAPS ───────────────────────────

async function getCoordinates(placeName) {
  try {
  
    const encoded = encodeURIComponent(placeName);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${GOOGLE_MAPS_API_KEY}`;


    const response = await fetch(url);
    const data = await response.json();


    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
      };
    }

    return null;

  } catch (err) {
    console.error(`Failed to get coordinates for ${placeName}:`, err.message);
    return null;
  }
}

// ─── FALLBACK COORDINATES ─────────────────────────────────────────────────

const fallbackCoords = {
  'soweto':      { lat: -26.265, lng: 27.854 },
  'alexandra':   { lat: -26.104, lng: 28.096 },
  'germiston':   { lat: -26.218, lng: 28.168 },
  'tembisa':     { lat: -25.997, lng: 28.227 },
  'diepsloot':   { lat: -25.932, lng: 28.013 },
  'orange-farm': { lat: -26.483, lng: 27.898 },
};

// ─── HELPER: BUILD REGIONS WITH REAL COORDINATES ──────────────────────────

async function buildRegions() {


  if (cachedRegions && cacheTime && (Date.now() - cacheTime) < CACHE_DURATION) {
    console.log('Using cached region coordinates from Google Maps');
    return cachedRegions;
  }

  console.log('Fetching fresh coordinates from Google Maps API...');


  const regions = await Promise.all(
    regionNames.map(async (region) => {


      const coords = await getCoordinates(region.name);


      const lat = coords?.lat ?? fallbackCoords[region.id].lat;
      const lng = coords?.lng ?? fallbackCoords[region.id].lng;

      return {
        id:      region.id,
        name:    region.name.split(',')[0], 
        emoji:   region.emoji,
        lat,
        lng,
        pickers: region.pickers,
        kg:      region.kg,
        target:  region.target,
        depots:  region.depots,
        status:  region.status,
        color:   region.color,
      };
    })
  );


  cachedRegions = regions;
  cacheTime     = Date.now();

  return regions;
}

// ─── ROUTE 1: GET ALL LOCATION DATA ──────────────────────────────────────

router.get('/', authRequired, async (req, res) => {
  try {
    const regions = await buildRegions();

    res.json({
      regions,
      depots,
      source: 'Google Maps Geocoding API',
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch location data.' });
  }
});

// ─── ROUTE 2: GET A SINGLE REGION ────────────────────────────────────────

router.get('/region/:id', authRequired, async (req, res) => {
  try {
    const regions = await buildRegions();
    const region  = regions.find(r => r.id === req.params.id);

    if (!region) {
      return res.status(404).json({ error: 'Region not found.' });
    }

    res.json({ region });

  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch region data.' });
  }
});

// ─── ROUTE 3: GET DEPOTS ONLY ─────────────────────────────────────────────

router.get('/depots', authRequired, (req, res) => {
  res.json({ depots });
});

module.exports = router;