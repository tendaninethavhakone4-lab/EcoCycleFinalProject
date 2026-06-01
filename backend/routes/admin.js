const express = require('express');
const router  = require('express').Router();

const { authRequired, requireRole } = require('../middleware/auth');

// ─── IN-MEMORY PICKER STORAGE ─────────────────────────────────────────────

const pickers = [
  {
    id: 'EC-0001',
    first_name: 'John',
    last_name: 'Mthembu',
    name: 'John Mthembu',
    phone: '071 234 5678',
    zone: 'Zone A — Johannesburg CBD',
    material: 'Plastic (PET)',
    address: '123 Main St, Johannesburg',
    payment: 'Cash',
    notes: 'Very reliable',
    gender: 'Male',
    id_number: '',
    dob: '',
    bank_account: '',
    joined: '2025-01-15',
    kg: 142,
    transactions: 12,
    earnings: 426,
  },
  {
    id: 'EC-0002',
    first_name: 'Sarah',
    last_name: 'Ndlovu',
    name: 'Sarah Ndlovu',
    phone: '082 345 6789',
    zone: 'Zone B — Soweto',
    material: 'Paper / Cardboard',
    address: '45 Vilakazi St, Soweto',
    payment: 'Mobile Money',
    notes: '',
    gender: 'Female',
    id_number: '',
    dob: '',
    bank_account: '',
    joined: '2025-02-03',
    kg: 88,
    transactions: 8,
    earnings: 176,
  },
  {
    id: 'EC-0003',
    first_name: 'David',
    last_name: 'Zuma',
    name: 'David Zuma',
    phone: '060 456 7890',
    zone: 'Zone C — Sandton',
    material: 'Metal (Aluminium)',
    address: '7 Rivonia Rd, Sandton',
    payment: 'Bank Transfer',
    notes: '',
    gender: 'Male',
    id_number: '',
    dob: '',
    bank_account: '',
    joined: '2025-02-18',
    kg: 118,
    transactions: 9,
    earnings: 826,
  },
];

// Keeps track of next picker number
let nextPickerNum = 4;


function generatePickerId() {
  return 'EC-' + String(nextPickerNum++).padStart(4, '0');
}

// ─── ROUTE 1: GET ALL PICKERS ─────────────────────────────────────────────

router.get('/pickers', authRequired, requireRole('admin', 'superadmin'), (req, res) => {
  res.json({ pickers });
});

// ─── ROUTE 2: REGISTER A NEW PICKER ──────────────────────────────────────

router.post('/pickers', authRequired, requireRole('admin', 'superadmin'), (req, res) => {

  const {
    first_name,
    last_name,
    name,
    phone,
    zone,
    material,
    address,
    payment,
    notes,
    gender,
    id_number,
    dob,
    bank_account,
  } = req.body;


  if (!first_name || !last_name || !phone || !zone) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }

  
  const existing = pickers.find(p => p.phone === phone);
  if (existing) {
    return res.status(400).json({ error: 'A picker with this phone number already exists.' });
  }

  const newPicker = {
    id: generatePickerId(),
    first_name,
    last_name,
    name: name || `${first_name} ${last_name}`,
    phone,
    zone,
    material:     material || 'Mixed / General',
    address:      address || '',
    payment:      payment || '',
    notes:        notes || '',
    gender:       gender || '',
    id_number:    id_number || '',
    dob:          dob || '',
    bank_account: bank_account || '',
    joined:       new Date().toLocaleDateString('en-ZA'),
    kg:           0,
    transactions: 0,
    earnings:     0,
  };

  pickers.push(newPicker);


  res.status(201).json({
    message: `${newPicker.name} registered successfully!`,
    picker: newPicker
  });
});

// ─── ROUTE 3: REMOVE A PICKER ─────────────────────────────────────────────

router.delete('/pickers/:id', authRequired, requireRole('admin', 'superadmin'), (req, res) => {

  const index = pickers.findIndex(p => p.id === req.params.id);


  if (index === -1) {
    return res.status(404).json({ error: 'Picker not found.' });
  }


  const removed = pickers.splice(index, 1)[0];

  res.json({
    message: `${removed.name} has been removed successfully.`,
    picker: removed
  });
});

// ─── ROUTE 4: GET DASHBOARD STATS ────────────────────────────────────────

router.get('/stats', authRequired, requireRole('admin', 'superadmin'), (req, res) => {

 
  const totalPickers   = pickers.length;
  const activePickers  = Math.ceil(pickers.length * 0.75); 
  const totalKg        = pickers.reduce((sum, p) => sum + (p.kg || 0), 0);
  const totalEarnings  = pickers.reduce((sum, p) => sum + (p.earnings || 0), 0);
  const totalTransactions = pickers.reduce((sum, p) => sum + (p.transactions || 0), 0);

  res.json({
    totalPickers,
    activePickers,
    totalKg,
    totalEarnings,
    totalTransactions,
  });
});

module.exports = router;