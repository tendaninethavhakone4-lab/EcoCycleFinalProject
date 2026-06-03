const API_URL = (() => {
  const h = window.location.hostname;
  return (!h || h === 'localhost' || h === '127.0.0.1') ? 'http://localhost:4000/api' : 'https://ecocycleprojectfinal-1.onrender.com/api';
})();

function getToken() {
  return localStorage.getItem('token');
}

function normalizeRole(role) {
  return String(role || '')
    .toLowerCase()
    .replace(/[\s_-]/g, '');
}

function headers() {
  return { Authorization: `Bearer ${getToken()}` };
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatTons(kg) {
  const tons = Number(kg || 0) / 1000;
  return `${tons.toFixed(tons >= 10 ? 0 : 1)} tons`;
}

async function apiGet(path) {
  const res = await fetch(`${API_URL}${path}`, { headers: headers() });
  if (res.status === 401) {
    window.location.href = '../AuthScreens/login.html';
    return null;
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Could not load ${path}`);
  }
  return res.json();
}

async function loadDashboard() {
  try {
    const data = await apiGet('/admin/super-stats');
    if (!data) return;

    updateStatCards(data.totals || {});
    updateSystemHealth(data.totals || {}, data.systemHealth || {});
    updateRegionalPerformance(data.regionalPerformance || []);
    animateBars();
  } catch (err) {
    console.error('Could not load super admin dashboard:', err.message);
    showDashboardError(err.message);
  }
}

function updateStatCards(totals) {
  const values = document.querySelectorAll('.stat-card .value');
  const captions = document.querySelectorAll('.stat-card .caption');

  if (values[0]) values[0].textContent = formatNumber(totals.totalTransactions);
  if (values[1]) values[1].textContent = formatTons(totals.totalKg);
  if (values[2]) values[2].textContent = formatNumber(totals.activePickers);
  if (values[3]) values[3].textContent = formatNumber(totals.activeBranches);

  if (captions[0]) captions[0].textContent = 'All database transactions';
  if (captions[1]) captions[1].textContent = 'Total recycled weight';
  if (captions[2]) captions[2].textContent = `${formatNumber(totals.totalPickers)} total pickers`;
  if (captions[3]) captions[3].textContent = `${formatNumber(totals.totalBranches)} total centres`;
}

function updateSystemHealth(totals, health) {
  const healthValues = document.querySelectorAll('.section-card:first-child .health-value');
  const healthSubs = document.querySelectorAll('.section-card:first-child .health-sub');

  if (healthValues[0]) healthValues[0].textContent = health.platformUptime || 'Online';
  if (healthValues[1]) healthValues[1].textContent = formatNumber(totals.totalPickers);
  if (healthValues[2]) {
    healthValues[2].textContent = health.transactionSuccessRate === null || health.transactionSuccessRate === undefined
      ? '-'
      : `${health.transactionSuccessRate}%`;
  }
  if (healthValues[3]) healthValues[3].textContent = health.responseTime || 'Live';

  if (healthSubs[0]) healthSubs[0].textContent = 'Backend responding';
  if (healthSubs[1]) healthSubs[1].textContent = `${formatNumber(totals.activePickers)} active`;
  if (healthSubs[2]) healthSubs[2].textContent = `${formatNumber(totals.totalTransactions)} transactions checked`;
  if (healthSubs[3]) healthSubs[3].textContent = 'API connected';
}

function updateRegionalPerformance(regions) {
  const regionItems = document.querySelectorAll('.section-card:nth-child(2) .region-item');
  const maxKg = Math.max(...regions.map(region => Number(region.kg || 0)), 1);

  regionItems.forEach((item, index) => {
    const region = regions[index];
    const label = item.querySelector('.health-label');
    const sub = item.querySelector('.health-sub');
    const value = item.querySelector('.health-value');
    const bar = item.querySelector('.region-bar');

    if (!region) {
      if (label) label.textContent = index === 0 ? 'No region data yet' : '-';
      if (sub) sub.textContent = index === 0 ? 'Record transactions with branches to populate this section' : '';
      if (value) value.textContent = '-';
      if (bar) bar.style.width = '0%';
      return;
    }

    const pct = Math.max(5, Math.round((Number(region.kg || 0) / maxKg) * 100));
    if (label) label.textContent = region.name || 'Unassigned';
    if (sub) sub.textContent = `${region.centres || 0} centres · ${region.pickers || 0} pickers · ${region.transactions || 0} transactions`;
    if (value) value.textContent = formatTons(region.kg);
    if (bar) bar.style.width = `${pct}%`;
  });
}

function animateBars() {
  document.querySelectorAll('.region-bar').forEach(bar => {
    const target = bar.style.width;
    bar.style.width = '0';
    setTimeout(() => { bar.style.width = target; }, 300);
  });
}

function showDashboardError(message) {
  let box = document.getElementById('dashboardError');
  if (!box) {
    box = document.createElement('div');
    box.id = 'dashboardError';
    box.style.cssText = 'position:fixed;right:24px;bottom:24px;background:#ef4444;color:#fff;padding:14px 18px;border-radius:12px;font-weight:700;z-index:9999;box-shadow:0 12px 30px rgba(0,0,0,.2)';
    document.body.appendChild(box);
  }
  box.textContent = message || 'Could not load dashboard data.';
}

document.addEventListener('DOMContentLoaded', () => {
  if (!getToken()) {
    window.location.href = '../AuthScreens/login.html';
    return;
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = normalizeRole(user.role);

  if (role !== 'superadmin') {
    window.location.href = role === 'admin'
      ? '../AdminScreens/admin-dashboard.html'
      : '../UserScreens/EmployeeDashboard.html';
    return;
  }

  loadDashboard();

  const logoutBtn = document.getElementById('logoutBtn') || document.querySelector('.topbar-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '../AuthScreens/login.html';
    });
  }
});
