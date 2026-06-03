const API_URL = (() => {
  const h = window.location.hostname;
  return (!h || h === 'localhost' || h === '127.0.0.1') ? 'http://localhost:4000/api' : '/api';
})();

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
}

function authHeaders() {
  return { 'Authorization': `Bearer ${getToken()}` };
}

async function fetchJson(path) {
  const response = await fetch(`${API_URL}${path}`, { headers: authHeaders() });

  if (response.status === 401) {
    window.location.href = '../AuthScreens/login.html';
    return null;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Could not load ${path}`);
  return data;
}

function money(value) {
  return `R ${Number(value || 0).toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function kg(value) {
  return `${Number(value || 0).toLocaleString('en-ZA', {
    maximumFractionDigits: 1,
  })} kg`;
}

function dateValue(row) {
  return row.created_at ? new Date(row.created_at) : null;
}

function transactionsSince(transactions, days) {
  const start = new Date();
  start.setDate(start.getDate() - days);
  return transactions.filter(row => {
    const date = dateValue(row);
    return date && date >= start;
  });
}

function setText(selector, value, index = 0) {
  const el = document.querySelectorAll(selector)[index];
  if (el) el.textContent = value;
}

function updateHero(transactions, stats, locations) {
  const weekTransactions = transactionsSince(transactions, 7);
  const weekRevenue = weekTransactions.reduce((sum, row) => sum + Number(row.total || row.amount || 0), 0);
  const activeCentres = new Set([
    ...transactions.map(row => row.branch || row.zone).filter(Boolean),
    ...(locations?.regions || []).map(row => row.name).filter(Boolean),
  ]).size;

  setText('.hs-val', weekTransactions.length.toLocaleString(), 0);
  setText('.hs-val', money(weekRevenue), 1);
  setText('.hs-val', (activeCentres || stats.activePickers || 0).toLocaleString(), 2);
}

function updateImpactCards(transactions, summary, stats, materials) {
  const monthTransactions = transactionsSince(transactions, 31);
  const monthRevenue = monthTransactions.reduce((sum, row) => sum + Number(row.total || row.amount || 0), 0);
  const monthKg = monthTransactions.reduce((sum, row) => sum + Number(row.quantity || row.weight || 0), 0);

  const values = document.querySelectorAll('.impact-card .value');
  const captions = document.querySelectorAll('.impact-card .caption');
  const trends = document.querySelectorAll('.impact-card .stat-trend');

  if (values[0]) values[0].textContent = monthTransactions.length.toLocaleString();
  if (values[1]) values[1].textContent = money(monthRevenue);
  if (values[2]) values[2].textContent = kg(monthKg);
  if (values[3]) values[3].textContent = `${materials.length} items`;

  if (captions[0]) captions[0].textContent = 'Tracked this month';
  if (captions[1]) captions[1].textContent = 'Revenue this month';
  if (captions[2]) captions[2].textContent = `${stats.activePickers || 0} active pickers`;
  if (captions[3]) captions[3].textContent = 'Material rates available';

  if (trends[0]) trends[0].textContent = `${summary.totalTransactions || transactions.length || 0} all-time transactions`;
  if (trends[1]) trends[1].textContent = `${money(summary.totalPayouts || 0)} all-time payouts`;
  if (trends[2]) trends[2].textContent = `${kg(summary.totalKg || 0)} all-time collected`;
  if (trends[3]) trends[3].textContent = 'Connected to materials route';
}

function updateCentresList(transactions) {
  const container = document.getElementById('centresList');
  if (!container) return;

  const grouped = new Map();
  transactions.forEach(row => {
    const name = row.branch || row.zone || 'Unassigned';
    if (!grouped.has(name)) grouped.set(name, { count: 0, kg: 0, revenue: 0 });

    const centre = grouped.get(name);
    centre.count += 1;
    centre.kg += Number(row.quantity || row.weight || 0);
    centre.revenue += Number(row.total || row.amount || 0);
  });

  const entries = [...grouped.entries()].sort((a, b) => b[1].kg - a[1].kg);
  const maxKg = entries[0]?.[1].kg || 1;

  if (!entries.length) {
    container.innerHTML = '<p style="color:var(--text-soft);font-size:14px;padding:12px 0">No centre data yet. Record transactions first.</p>';
    return;
  }

  container.innerHTML = entries.slice(0, 6).map(([name, data], index) => {
    const pct = Math.round((data.kg / maxKg) * 100);
    return `
      <div class="centre-row">
        <div class="centre-rank">${index + 1}</div>
        <div class="centre-info">
          <div class="centre-name">${name}</div>
          <div class="centre-sub">${data.count} transaction${data.count === 1 ? '' : 's'} - ${money(data.revenue)}</div>
          <div class="prog-wrap"><div class="prog-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="centre-kg">${kg(data.kg)}</div>
      </div>`;
  }).join('');
}

function updatePriceUpdates(materials) {
  const container = document.getElementById('updatesList');
  if (!container) return;

  if (!materials.length) {
    container.innerHTML = '<p style="color:var(--text-soft);font-size:14px;padding:12px 0">No materials found.</p>';
    return;
  }

  container.innerHTML = materials.slice(0, 8).map(material => {
    const price = Number(material.pricePerKg || material.price_per_kg || material.rate || 0);
    return `
      <div class="update-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-weight:600;font-size:14px">${material.name || material.material || 'Material'}</div>
          <div style="font-size:12px;color:var(--text-soft)">Per kg</div>
        </div>
        <div style="font-weight:700;color:var(--primary);font-size:15px">R ${price.toLocaleString('en-ZA')} / kg</div>
      </div>`;
  }).join('');
}

async function loadDashboard() {
  try {
    const [statsData, summaryData, transactionsData, materialsData, locationsData] = await Promise.all([
      fetchJson('/admin/stats'),
      fetchJson('/transactions/summary'),
      fetchJson('/transactions'),
      fetchJson('/materials'),
      fetchJson('/locations').catch(() => ({ regions: [] })),
    ]);

    if (!statsData || !summaryData || !transactionsData || !materialsData) return;

    const transactions = transactionsData.transactions || [];
    const materials = materialsData.materials || [];

    updateHero(transactions, statsData, locationsData);
    updateImpactCards(transactions, summaryData, statsData, materials);
    updateCentresList(transactions);
    updatePriceUpdates(materials);
  } catch (err) {
    console.error('Could not load admin dashboard:', err.message);
    updateCentresList([]);
    updatePriceUpdates([]);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!getToken()) {
    window.location.href = '../AuthScreens/login.html';
    return;
  }

  const user = getUser();
  const role = String(user.role || '').toLowerCase();
  if (!['admin', 'superadmin'].includes(role)) {
    alert(`You are logged in as ${role || 'unknown'}, so you cannot open Admin.`);
    window.location.href = '../AuthScreens/user-selection.html';
    return;
  }

  loadDashboard();

  const logoutBtn = document.querySelector('.topbar-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '../AuthScreens/login.html';
    });
  }
});