const ADMIN_ENV_API_URL = (() => {
  const h = window.location.hostname;
  return (!h || h === 'localhost' || h === '127.0.0.1') ? 'http://localhost:4000/api' : '/api';
})();

let adminEnvTrendChart = null;

function envToken() {
  return localStorage.getItem('token');
}

async function envFetch(path) {
  const response = await fetch(`${ADMIN_ENV_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${envToken()}` },
  });

  if (response.status === 401) {
    window.location.href = '../AuthScreens/login.html';
    return null;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not load environmental data.');
  return data;
}

function kgValue(row) {
  return Number(row.quantity ?? row.weight ?? 0);
}

function formatKg(value) {
  const kg = Number(value || 0);
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} tons`;
  return `${Math.round(kg).toLocaleString()} kg`;
}

function formatLitres(value) {
  const litres = Number(value || 0);
  if (litres >= 1000) return `${Math.round(litres / 1000).toLocaleString()}K L`;
  return `${Math.round(litres).toLocaleString()} L`;
}

function monthLabel(date) {
  return date.toLocaleString('en-ZA', { month: 'short' });
}

function impactFactors(material) {
  const name = String(material || '').toLowerCase();
  if (name.includes('plastic') || name.includes('pet') || name.includes('hdpe')) return { co2: 1.8, water: 22 };
  if (name.includes('paper') || name.includes('cardboard')) return { co2: 1.4, water: 35 };
  if (name.includes('metal') || name.includes('aluminium')) return { co2: 4.0, water: 12 };
  if (name.includes('glass')) return { co2: 0.6, water: 5 };
  return { co2: 1.2, water: 10 };
}

function totalImpact(transactions) {
  return transactions.reduce((totals, row) => {
    const kg = kgValue(row);
    const factors = impactFactors(row.material);
    totals.kg += kg;
    totals.co2 += kg * factors.co2;
    totals.water += kg * factors.water;
    return totals;
  }, { kg: 0, co2: 0, water: 0 });
}

function setStatCards(transactions, pickers) {
  const totals = totalImpact(transactions);
  const values = document.querySelectorAll('.stat-card .value');
  const captions = document.querySelectorAll('.stat-card .caption');

  if (values[0]) values[0].textContent = formatKg(totals.kg);
  if (values[1]) values[1].textContent = formatKg(totals.co2);
  if (values[2]) values[2].textContent = Number(pickers.length || 0).toLocaleString();
  if (values[3]) values[3].textContent = formatLitres(totals.water);

  if (captions[0]) captions[0].textContent = 'From recorded transactions';
  if (captions[1]) captions[1].textContent = 'Estimated from materials';
  if (captions[2]) captions[2].textContent = 'Registered pickers';
  if (captions[3]) captions[3].textContent = 'Estimated litres conserved';
}

function groupMonthlyMaterials(transactions) {
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: monthLabel(date),
      totals: {},
    });
  }

  const monthMap = new Map(months.map(month => [month.key, month]));
  transactions.forEach(row => {
    const date = row.created_at ? new Date(row.created_at) : new Date();
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const bucket = monthMap.get(key);
    if (!bucket) return;
    const material = row.material || 'Other';
    bucket.totals[material] = (bucket.totals[material] || 0) + kgValue(row);
  });

  const materialTotals = {};
  transactions.forEach(row => {
    const material = row.material || 'Other';
    materialTotals[material] = (materialTotals[material] || 0) + kgValue(row);
  });

  const topMaterials = Object.entries(materialTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([material]) => material);

  return { months, topMaterials };
}

function updateTrendChart(transactions) {
  const ctx = document.getElementById('trendsChart')?.getContext('2d');
  if (!ctx || !window.Chart) return;

  const { months, topMaterials } = groupMonthlyMaterials(transactions);
  const colors = ['#2E7D32', '#66BB6A', '#1565C0', '#F59E0B'];
  const materials = topMaterials.length ? topMaterials : ['No data'];

  if (adminEnvTrendChart) adminEnvTrendChart.destroy();
  adminEnvTrendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months.map(month => month.label),
      datasets: materials.map((material, index) => ({
        label: material,
        data: months.map(month => Number((month.totals[material] || 0).toFixed(2))),
        borderColor: colors[index % colors.length],
        backgroundColor: `${colors[index % colors.length]}18`,
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 3,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { family: 'DM Sans', size: 12 }, boxWidth: 12 },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 11 } } },
        y: {
          grid: { color: '#F0EDE5' },
          ticks: {
            font: { family: 'DM Sans', size: 11 },
            callback: value => `${value} kg`,
          },
        },
      },
    },
  });
}

function groupByCentre(transactions) {
  const grouped = new Map();
  transactions.forEach(row => {
    const centre = row.branch || row.zone || 'Unassigned';
    if (!grouped.has(centre)) grouped.set(centre, { kg: 0, co2: 0 });
    const stats = grouped.get(centre);
    const kg = kgValue(row);
    stats.kg += kg;
    stats.co2 += kg * impactFactors(row.material).co2;
  });

  return [...grouped.entries()]
    .map(([centre, stats]) => ({ centre, ...stats }))
    .sort((a, b) => b.kg - a.kg);
}

function updateTopCentres(transactions) {
  const cards = document.querySelectorAll('.charts-row .section-card');
  const card = cards[0];
  if (!card) return;

  const centres = groupByCentre(transactions).slice(0, 4);
  card.innerHTML = `
    <div class="section-title">Top Performing Centres</div>
    ${centres.length ? centres.map(row => `
      <div class="activity-item">
        <div class="activity-left"><h4>${row.centre}</h4><p>${formatKg(row.kg)} collected</p></div>
        <div class="activity-right"><div class="amount">${formatKg(row.co2)} CO2</div></div>
      </div>
    `).join('') : `
      <div class="activity-item">
        <div class="activity-left"><h4>No centre data yet</h4><p>Recorded transactions will appear here.</p></div>
      </div>
    `}
  `;
}

function updateMilestones(transactions, pickers) {
  const cards = document.querySelectorAll('.charts-row .section-card');
  const card = cards[1];
  if (!card) return;

  const totals = totalImpact(transactions);
  const milestones = [
    { title: '50 tons material collected', complete: totals.kg >= 50000, detail: `${Math.round((totals.kg / 50000) * 100)}% complete` },
    { title: '100 tons CO2 offset target', complete: totals.co2 >= 100000, detail: `${Math.round((totals.co2 / 100000) * 100)}% complete` },
    { title: '500K litres water saved', complete: totals.water >= 500000, detail: `${Math.round((totals.water / 500000) * 100)}% complete` },
    { title: '100 active pickers onboarded', complete: pickers.length >= 100, detail: `${pickers.length} pickers registered` },
  ];

  card.innerHTML = `
    <div class="section-title">Environmental Milestones</div>
    ${milestones.map(row => `
      <div class="milestone-item">
        <div class="milestone-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${row.complete ? 'var(--primary)' : 'var(--amber)'}"
               stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            ${row.complete
              ? '<polyline points="20 6 9 17 4 12"/>'
              : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'}
          </svg>
        </div>
        <div class="milestone-body">
          <div class="milestone-title">${row.title}</div>
          <div class="milestone-sub">${row.complete ? 'Completed' : row.detail}</div>
        </div>
      </div>
    `).join('')}
  `;
}

function adminEnvUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
}

async function loadAdminEnvironmentalDashboard() {
  const role = String(adminEnvUser().role || '').toLowerCase().replace(/[\s_-]/g, '');
  if (role && role !== 'admin' && role !== 'superadmin') {
    alert('You are logged in as employee, so you cannot open Admin.');
    window.location.href = '../AuthScreens/user-selection.html';
    return;
  }

  try {
    const [transactionsData, pickersData] = await Promise.all([
      envFetch('/transactions'),
      envFetch('/admin/pickers'),
    ]);
    if (!transactionsData || !pickersData) return;

    const transactions = transactionsData.transactions || [];
    const pickers = pickersData.pickers || [];
    setStatCards(transactions, pickers);
    updateTrendChart(transactions);
    updateTopCentres(transactions);
    updateMilestones(transactions, pickers);
  } catch (err) {
    console.error('Could not load admin environmental dashboard:', err.message);
    updateTrendChart([]);
    updateTopCentres([]);
    updateMilestones([], []);
  }
}

document.addEventListener('DOMContentLoaded', loadAdminEnvironmentalDashboard);
