const express = require('express');
const router  = express.Router();

const { authRequired, requireRole } = require('../middleware/auth');

// ─── IN-MEMORY MATERIALS STORAGE ──────────────────────────────────────────

const materials = [
  {
    id: 1,
    name: 'Plastic (PET)',
    pricePerKg: 12,
    unit: 'kg',
    active: true,
  },
  {
    id: 2,
    name: 'Plastic (HDPE)',
    pricePerKg: 10,
    unit: 'kg',
    active: true,
  },
  {
    id: 3,
    name: 'Paper / Cardboard',
    pricePerKg: 8,
    unit: 'kg',
    active: true,
  },
  {
    id: 4,
    name: 'Metal (Aluminium)',
    pricePerKg: 25,
    unit: 'kg',
    active: true,
  },
  {
    id: 5,
    name: 'Glass',
    pricePerKg: 6,
    unit: 'kg',
    active: true,
  },
  {
    id: 6,
    name: 'Mixed / General',
    pricePerKg: 5,
    unit: 'kg',
    active: true,
  },
];

// ─── ROUTE 1: GET ALL MATERIALS ───────────────────────────────────────────

router.get('/', authRequired, (req, res) => {
  res.json({ materials });
});

// ─── ROUTE 2: UPDATE A MATERIAL PRICE ────────────────────────────────────

router.put('/:id', authRequired, requireRole('admin', 'superadmin'), (req, res) => {

  
  const material = materials.find(m => m.id === Number(req.params.id));

  if (!material) {
    return res.status(404).json({ error: 'Material not found.' });
  }

  const { pricePerKg, active } = req.body;

  
  if (pricePerKg !== undefined) {
    if (typeof pricePerKg !== 'number' || pricePerKg < 0) {
      return res.status(400).json({ error: 'Price must be a positive number.' });
    }
    
    material.pricePerKg = pricePerKg;
  }


  if (active !== undefined) {
    material.active = active;
  }

  res.json({
    message: `${material.name} price updated successfully.`,
    material
  });
});

// ─── ROUTE 3: GET A SINGLE MATERIAL ──────────────────────────────────────

router.get('/:id', authRequired, (req, res) => {

  const material = materials.find(m => m.id === Number(req.params.id));

  if (!material) {
    return res.status(404).json({ error: 'Material not found.' });
  }

  res.json({ material });
});

module.exports = router;