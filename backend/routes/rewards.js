const express = require('express');
const router  = express.Router();

const { authRequired } = require('../middleware/auth');

// ─── IN-MEMORY REWARDS STORAGE ────────────────────────────────────────────

const rewards = [
  {
    picker_id:   'EC-0001',
    picker_name: 'John Mthembu',
    xp:          3840,
    level:       4,
    streak:      7,
    lastActive:  '2026-05-28',
    badges: [
      { id: 'plastic-pioneer', name: 'Plastic Pioneer', earned: '2026-03-01' },
      { id: 'early-bird',      name: 'Early Bird',      earned: '2026-03-15' },
    ],
  },
  {
    picker_id:   'EC-0002',
    picker_name: 'Sarah Ndlovu',
    xp:          2100,
    level:       3,
    streak:      3,
    lastActive:  '2026-05-27',
    badges: [
      { id: 'early-bird', name: 'Early Bird', earned: '2026-04-01' },
    ],
  },
  {
    picker_id:   'EC-0003',
    picker_name: 'David Zuma',
    xp:          4200,
    level:       5,
    streak:      10,
    lastActive:  '2026-05-28',
    badges: [
      { id: 'plastic-pioneer', name: 'Plastic Pioneer',  earned: '2026-02-10' },
      { id: 'streak-master',   name: 'Streak Master',    earned: '2026-04-20' },
      { id: 'top-collector',   name: 'Top Collector',    earned: '2026-05-01' },
    ],
  },
];

// ─── BADGE RULES ──────────────────────────────────────────────────────────

const badgeRules = [
  { id: 'first-collection', name: 'First Collection', xpRequired: 100  },
  { id: 'plastic-pioneer',  name: 'Plastic Pioneer',  xpRequired: 500  },
  { id: 'early-bird',       name: 'Early Bird',       xpRequired: 1000 },
  { id: 'streak-master',    name: 'Streak Master',    xpRequired: 2000 },
  { id: 'top-collector',    name: 'Top Collector',    xpRequired: 4000 },
  { id: 'eco-champion',     name: 'Eco Champion',     xpRequired: 6000 },
];

// ─── HELPER: CHECK AND AWARD BADGES ──────────────────────────────────────

function checkAndAwardBadges(pickerReward) {
  const newBadges = [];

  badgeRules.forEach(rule => {
   
    const alreadyHas = pickerReward.badges.some(b => b.id === rule.id);
    if (pickerReward.xp >= rule.xpRequired && !alreadyHas) {
      const newBadge = {
        id:     rule.id,
        name:   rule.name,
        earned: new Date().toISOString().split('T')[0],
      };
      pickerReward.badges.push(newBadge);
      newBadges.push(newBadge);
    }
  });

  return newBadges;
}

// ─── HELPER: CALCULATE LEVEL ──────────────────────────────────────────────

function calculateLevel(xp) {
  return Math.floor(xp / 1000) + 1;
}

// ─── ROUTE 1: GET LEADERBOARD ─────────────────────────────────────────────

router.get('/', authRequired, (req, res) => {

 
  const leaderboard = [...rewards]
    .sort((a, b) => b.xp - a.xp)
    .map((r, index) => ({
      rank:        index + 1,
      picker_id:   r.picker_id,
      picker_name: r.picker_name,
      xp:          r.xp,
      level:       r.level,
      streak:      r.streak,
      badges:      r.badges,
      lastActive:  r.lastActive,
    }));

  res.json({ leaderboard });
});

// ─── ROUTE 2: GET A SINGLE PICKER'S REWARDS ──────────────────────────────

router.get('/:picker_id', authRequired, (req, res) => {

  const pickerReward = rewards.find(r => r.picker_id === req.params.picker_id);

  if (!pickerReward) {
    return res.status(404).json({ error: 'No rewards found for this picker.' });
  }

  res.json({ rewards: pickerReward });
});

// ─── ROUTE 3: ADD XP TO A PICKER ─────────────────────────────────────────

router.post('/add', authRequired, (req, res) => {

  const { picker_id, xp, reason } = req.body;

  if (!picker_id || !xp) {
    return res.status(400).json({ error: 'picker_id and xp are required.' });
  }

  if (isNaN(xp) || Number(xp) <= 0) {
    return res.status(400).json({ error: 'XP must be a positive number.' });
  }


  let pickerReward = rewards.find(r => r.picker_id === picker_id);

  
  if (!pickerReward) {
    pickerReward = {
      picker_id,
      picker_name: picker_id,
      xp:          0,
      level:       1,
      streak:      0,
      lastActive:  new Date().toISOString().split('T')[0],
      badges:      [],
    };
    rewards.push(pickerReward);
  }


  pickerReward.xp        += Number(xp);
  pickerReward.level      = calculateLevel(pickerReward.xp);
  pickerReward.lastActive = new Date().toISOString().split('T')[0];


  const newBadges = checkAndAwardBadges(pickerReward);

  res.json({
    message:    `${Number(xp)} XP added successfully!`,
    reason:     reason || 'Transaction recorded',
    rewards:    pickerReward,
    newBadges,
  });
});

module.exports = router;