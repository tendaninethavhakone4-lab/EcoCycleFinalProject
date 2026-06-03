const API_URL = (() => {
  const h = window.location.hostname;
  return (!h || h === 'localhost' || h === '127.0.0.1') ? 'http://localhost:4000/api' : '/api';
})();

function getToken() {
  return localStorage.getItem('token');
}

function normalizeRole(role) {
  return String(role || '')
    .toLowerCase()
    .replace(/[\s_-]/g, '');
}

function formatKg(value) {
  return `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`;
}

function formatTonsFromKg(value) {
  const tons = Number(value || 0) / 1000;
  return `${tons.toLocaleString(undefined, { maximumFractionDigits: tons >= 10 ? 0 : 1 })} t`;
}

function formatLitres(value) {
  return `${Math.round(Number(value || 0)).toLocaleString()} L`;
}

async function apiGet(path) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  if (res.status === 401) {
    window.location.href = '../AuthScreens/login.html';
    return null;
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Could not load environmental dashboard data.');
  }

  return res.json();
}

async function loadEnvironmentalDashboard() {
  try {
    const data = await apiGet('/admin/super-environmental');
    if (!data) return;

    updateTopStats(data.totals || {});
    updateOverview(data.totals || {});
    updateRegionalPerformance(data.regionalPerformance || []);
    renderChart(data.monthly || {});
  } catch (err) {
    console.error('Could not load environmental dashboard:', err.message);
    showError(err.message);
  }
}

function updateTopStats(totals) {
  const values = document.querySelectorAll('.stat-card .value');
  const captions = document.querySelectorAll('.stat-card .caption');

  if (values[0]) values[0].textContent = formatKg(totals.monthKg || totals.totalKg);
  if (values[1]) values[1].textContent = formatTonsFromKg(totals.co2Kg);
  if (values[2]) values[2].textContent = formatLitres(totals.waterLitres);
  if (values[3]) values[3].textContent = Number(totals.activePickers || 0).toLocaleString();

  if (captions[0]) captions[0].textContent = totals.monthKg ? 'This month from database' : 'All-time from database';
  if (captions[1]) captions[1].textContent = 'Estimated from material type';
  if (captions[2]) captions[2].textContent = 'Estimated environmental saving';
  if (captions[3]) captions[3].textContent = 'Active in Supabase';
}

function updateOverview(totals) {
  const values = document.querySelectorAll('.section-card:first-child .health-value');
  const subs = document.querySelectorAll('.section-card:first-child .health-sub');

  if (values[0]) values[0].textContent = `${totals.sortingRate || 0}%`;
  if (values[1]) values[1].textContent = formatTonsFromKg(totals.co2Kg);
  if (values[2]) values[2].textContent = formatLitres(totals.waterLitres);
  if (values[3]) values[3].textContent = Number(totals.regionsReporting || 0).toLocaleString();

  if (subs[0]) subs[0].textContent = `${Number(totals.transactions || 0).toLocaleString()} transactions classified`;
  if (subs[1]) subs[1].textContent = 'Estimated from recorded recycling';
  if (subs[2]) subs[2].textContent = 'Estimated from material mix';
  if (subs[3]) subs[3].textContent = 'Branches/regions with picker or transaction data';
}

function updateRegionalPerformance(regions) {
  const rows = document.querySelectorAll('.section-card:nth-child(2) .region-item');
  const maxKg = Math.max(...regions.map(region => Number(region.kg || 0)), 1);

  rows.forEach((row, index) => {
    const region = regions[index];
    const label = row.querySelector('.health-label');
    const sub = row.querySelector('.health-sub');
    const value = row.querySelector('.health-value');
    const bar = row.querySelector('.region-bar');

    if (!region) {
      if (label) label.textContent = index === 0 ? 'No regional data yet' : '-';
      if (sub) sub.textContent = index === 0 ? 'Record transactions with branch details to populate this section' : '';
      if (value) value.textContent = '-';
      if (bar) bar.style.width = '0%';
      return;
    }

    const percent = region.percentOfGoal || Math.round((Number(region.kg || 0) / maxKg) * 100);
    if (label) label.textContent = region.name || 'Unassigned';
    if (sub) sub.textContent = `${percent}% of goal · ${formatKg(region.kg)} · ${region.transactions || 0} transactions`;
    if (value) value.textContent = formatKg(region.kg);
    if (bar) bar.style.width = `${Math.max(5, Math.min(100, percent))}%`;
  });
}

function renderChart(monthly) {
  const chart = document.getElementById('barChart');
  if (!chart) return;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const thisYear = monthly.thisYear || Array(12).fill(0);
  const lastYear = monthly.lastYear || Array(12).fill(0);
  const max = Math.max(...thisYear, ...lastYear, 1);

  chart.innerHTML = months.map((month, index) => `
    <div class="bar-col" title="${month}: ${formatKg(thisYear[index])}">
      <div class="bar-wrap">
        <div class="bar secondary" style="height:${(Number(lastYear[index] || 0) / max) * 100}%"></div>
        <div class="bar primary" style="height:${(Number(thisYear[index] || 0) / max) * 100}%"></div>
      </div>
      <div class="bar-lbl">${month}</div>
    </div>
  `).join('');
}

function showError(message) {
  let toast = document.getElementById('envDashboardError');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'envDashboardError';
    toast.style.cssText = 'position:fixed;right:24px;bottom:24px;background:#ef4444;color:#fff;padding:14px 18px;border-radius:12px;font-weight:700;z-index:9999;box-shadow:0 12px 30px rgba(0,0,0,.2)';
    document.body.appendChild(toast);
  }
  toast.textContent = message || 'Could not load environmental dashboard data.';
}

function wirePeriodButtons() {
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(item => item.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (!getToken()) {
    window.location.href = '../AuthScreens/login.html';
    return;
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (normalizeRole(user.role) !== 'superadmin') {
    window.location.href = '../AuthScreens/user-selection.html';
    return;
  }

  wirePeriodButtons();
  loadEnvironmentalDashboard();
});
