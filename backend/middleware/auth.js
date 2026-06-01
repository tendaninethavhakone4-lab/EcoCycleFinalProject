// Package creates and verifies JWT tokens
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'ecocycle_secret_key_change_later';

// ─── FUNCTION 1: authRequired ─────────────────────────────────────────────
// Checks every request to make sure the user is logged in

function authRequired(req, res, next) {

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error:'Please log in to your EcoCycle account to continue.' });
  }

  try {
   
    req.user = jwt.verify(token, SECRET);

    next();

  } catch (err) {

    return res.status(401).json({ error: 'Please log in to your EcoCycle account to continue.' });
  }
}

// ─── FUNCTION 2: requireRole ───────────────────────────────────────────────
// Checks role

function requireRole(...roles) {

  return (req, res, next) => {

    if (!req.user) {
      return res.status(401).json({ error: 'Please log in to your EcoCycle account to continue.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You are not authorized to view this page.' });
    }

    next();
  };
}


module.exports = { authRequired, requireRole };