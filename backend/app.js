const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app = express();

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────
// cors allows our frontend to talk to the backend

app.use(cors());

//Allows the server to read JSON data sent from the frontend
app.use(express.json());

// ─── ROUTES ───────────────────────────────────────────────────────────────

app.use('/api/auth',         require('./routes/users'));        // login, register, approve
app.use('/api/transactions', require('./routes/transactions')); // record & view transactions
app.use('/api/materials',    require('./routes/materials'));    // material prices
app.use('/api/locations',    require('./routes/locations'));    // picker locations for map
app.use('/api/rewards',      require('./routes/rewards'));      // XP and rewards
app.use('/api/admin',        require('./routes/admin'));        // admin dashboard & pickers

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────
// This is a simple route to check if the server is running
// Open http://localhost:3000/api/health in your browser to test
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'EcoCycle API is running!',
    timestamp: new Date().toISOString()
  });
});

// ─── 404 HANDLER ──────────────────────────────────────────────────────────

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ─── START SERVER ─────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(` EcoCycle API is running on http://localhost:${PORT}`);
  console.log(`   Test it: http://localhost:${PORT}/api/health`);
});