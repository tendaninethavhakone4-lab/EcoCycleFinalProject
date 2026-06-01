const express = require('express');
const router  = express.Router();

const { authRequired, requireRole } = require('../middleware/auth');

const { sendTransactionSMS } = require('../services/sms');

// ─── IN-MEMORY TRANSACTION STORAGE ───────────────────────────────────────

const transactions = [
  {
    id: 'TXN-0001',
    picker_id: 'EC-0001',
    picker_name: 'John Mthembu',
    material: 'Plastic (PET)',
    pricePerKg: 12,
    quantity: 14,
    total: 168,
    zone: 'Zone A — Johannesburg CBD',
    notes: '',
    date: '2026-05-01',
    recorded_by: 'Admin User',
    created_at: '2026-05-01T09:23:00Z',
  },
  {
    id: 'TXN-0002',
    picker_id: 'EC-0002',
    picker_name: 'Sarah Ndlovu',
    material: 'Paper / Cardboard',
    pricePerKg: 8,
    quantity: 22,
    total: 176,
    zone: 'Zone B — Soweto',
    notes: 'Morning collection',
    date: '2026-05-02',
    recorded_by: 'Admin User',
    created_at: '2026-05-02T10:15:00Z',
  },
  {
    id: 'TXN-0003',
    picker_id: 'EC-0003',
    picker_name: 'David Zuma',
    material: 'Metal (Aluminium)',
    pricePerKg: 25,
    quantity: 8,
    total: 200,
    zone: 'Zone C — Sandton',
    notes: '',
    date: '2026-05-03',
    recorded_by: 'Admin User',
    created_at: '2026-05-03T11:00:00Z',
  },
];

let nextTxnNum = 4;

function generateTxnId() {
  return 'TXN-' + String(nextTxnNum++).padStart(4, '0');
}


const materialPrices = {
  'Plastic (PET)':      12,
  'Plastic (HDPE)':     10,
  'Paper / Cardboard':  8,
  'Metal (Aluminium)':  25,
  'Glass':              6,
  'Mixed / General':    5,
};

// ─── ROUTE 1: GET ALL TRANSACTIONS ───────────────────────────────────────

router.get('/', authRequired, (req, res) => {

  const sorted = [...transactions].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  res.json({
    transactions: sorted,
    total: sorted.length,
  });
});

// ─── ROUTE 2: RECORD A NEW TRANSACTION ───────────────────────────────────

router.post('/', authRequired, (req, res) => {

  const {
    picker_id,
    picker_name,
    material,
    quantity,
    zone,
    notes,
    date,
  } = req.body;


  if (!picker_id || !material || !quantity) {
    return res.status(400).json({
      error: 'Please fill in all required fields — picker, material and quantity are required.'
    });
  }

  if (isNaN(quantity) || Number(quantity) <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive number.' });
  }

  const pricePerKg = materialPrices[material];
  if (!pricePerKg) {
    return res.status(400).json({ error: 'Invalid material type.' });
  }

  const total = Math.round(Number(quantity) * pricePerKg * 100) / 100;

  const newTransaction = {
    id:           generateTxnId(),
    picker_id,
    picker_name:  picker_name || picker_id,
    material,
    pricePerKg,
    quantity:     Number(quantity),
    total,
    zone:         zone || '',
    notes:        notes || '',
    date:         date || new Date().toISOString().split('T')[0],
    recorded_by:  req.user.name,  // from the JWT token
    created_at:   new Date().toISOString(),
  };

  transactions.push(newTransaction);

// Send SMS notification to picker if they have a phone number

sendTransactionSMS(
  newTransaction.picker_name,
  req.body.picker_phone || '',
  newTransaction.material,
  newTransaction.quantity,
  newTransaction.total
).catch(err => console.error('SMS notification failed:', err.message));

  res.status(201).json({
    message: `Transaction recorded successfully! Total payout: R${total}`,
    transaction: newTransaction,
  });
});

// ─── ROUTE 3: GET TRANSACTIONS FOR A SPECIFIC PICKER ─────────────────────

router.get('/picker/:id', authRequired, (req, res) => {

  const pickerTxns = transactions
    .filter(t => t.picker_id === req.params.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (pickerTxns.length === 0) {
    return res.json({
      transactions: [],
      message: 'No transactions found for this picker.'
    });
  }

  const totalKg       = pickerTxns.reduce((sum, t) => sum + t.quantity, 0);
  const totalEarnings = pickerTxns.reduce((sum, t) => sum + t.total, 0);

  res.json({
    picker_id: req.params.id,
    transactions: pickerTxns,
    summary: {
      totalTransactions: pickerTxns.length,
      totalKg,
      totalEarnings,
    }
  });
});

// ─── ROUTE 4: GET TRANSACTION SUMMARY ────────────────────────────────────

router.get('/summary', authRequired, (req, res) => {

  const totalTransactions = transactions.length;
  const totalKg           = transactions.reduce((sum, t) => sum + t.quantity, 0);
  const totalPayouts      = transactions.reduce((sum, t) => sum + t.total, 0);

  const byMaterial = {};
  transactions.forEach(t => {
    if (!byMaterial[t.material]) {
      byMaterial[t.material] = { kg: 0, total: 0, count: 0 };
    }
    byMaterial[t.material].kg    += t.quantity;
    byMaterial[t.material].total += t.total;
    byMaterial[t.material].count += 1;
  });

  res.json({
    totalTransactions,
    totalKg,
    totalPayouts,
    byMaterial,
  });
});

module.exports = router;