const ADMIN_INCOME_API_URL = (() => {
  const h = window.location.hostname;
  return (!h || h === 'localhost' || h === '127.0.0.1') ? 'http://localhost:4000/api' : '/api';
})();

let adminIncomeCentreChart = null;
let adminIncomeMaterialChart = null;

function adminIncomeToken() {
  return localStorage.getItem('token');
}

function adminIncomeUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
}

async function adminIncomeFetch(path) {
  const response = await fetch(`${ADMIN_INCOME_API_URL}${path}`, {
    headers: { 'Authorization': `Bearer ${adminIncomeToken()}` },
  });

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

function monthName(date = new Date()) {
  return date.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
}

function isSince(row, date) {
  if (!row.created_at) return false;
  return new Date(row.created_at) >= date;
}

function updateAdminIncomeStats(transactions, summary) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const monthTransactions = transactions.filter(row => isSince(row, monthStart));
  const weekTransactions = transactions.filter(row => isSince(row, weekStart));
  const monthlyRevenue = monthTransactions.reduce((sum, row) => sum + Number(row.total || row.amount || 0), 0);
  const weeklyRevenue = weekTransactions.reduce((sum, row) => sum + Number(row.total || row.amount || 0), 0);
  const uniquePickers = new Set(transactions.map(row => row.picker_id).filter(Boolean)).size;
  const pendingPayouts = transactions
    .filter(row => String(row.status || '').toLowerCase() === 'pending')
    .reduce((sum, row) => sum + Number(row.total || row.amount || 0), 0);
  const avgPerPicker = uniquePickers ? Number(summary.totalPayouts || 0) / uniquePickers : 0;

  const stats = [
    {
      label: 'Monthly Revenue',
      value: money(monthlyRevenue),
      caption: monthName(now),
      colorClass: 'green',
      icon: '<svg viewBox="0 0 24 24"><line x1="12" x2="12" y1="1" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    },
    {
      label: 'Weekly Revenue',
      value: money(weeklyRevenue),
      caption: `${weekTransactions.length} transactions this week`,
      colorClass: 'blue',
      icon: '<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    },
    {
      label: 'Avg per Picker',
      value: money(avgPerPicker),
      caption: `Based on ${uniquePickers} picker${uniquePickers === 1 ? '' : 's'}`,
      colorClass: 'purple',
      icon: '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    },
    {
      label: 'Pending Payouts',
      value: money(pendingPayouts),
      caption: 'Awaiting approval',
      colorClass: 'amber',
      icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    },
  ];

  const row = document.getElementById('statsRow');
  if (!row) return;

  row.innerHTML = stats.map(stat => `
    <div class="stat-card">
      <div class="stat-card-left">
        <h4>${stat.label}</h4>
        <div class="value">${stat.value}</div>
        <div class="caption">${stat.caption}</div>
      </div>
      <div class="stat-icon ${stat.colorClass}">${stat.icon}</div>
    </div>`).join('');
}

function groupTotals(transactions, keyFn) {
  const grouped = new Map();
  transactions.forEach(row => {
    const key = keyFn(row) || 'Unassigned';
    grouped.set(key, Number(grouped.get(key) || 0) + Number(row.total || row.amount || 0));
  });
  return [...grouped.entries()].sort((a, b) => b[1] - a[1]);
}

function updateCentreChart(transactions) {
  const ctx = document.getElementById('centreChart')?.getContext('2d');
  if (!ctx || !window.Chart) return;

  const grouped = groupTotals(transactions, row => row.branch || row.zone).slice(0, 8);
  const labels = grouped.length ? grouped.map(row => row[0]) : ['No data'];
  const values = grouped.length ? grouped.map(row => row[1]) : [0];

  if (adminIncomeCentreChart) adminIncomeCentreChart.destroy();
  adminIncomeCentreChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Revenue (R)',
        data: values,
        backgroundColor: ['#2E7D32', '#388E3C', '#43A047', '#66BB6A', '#81C784', '#A5D6A7', '#C8E6C9', '#E8F5E9'],
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 11 } } },
        y: { grid: { color: '#F0EDE5' }, ticks: { font: { family: 'DM Sans', size: 11 }, callback: value => `R ${Number(value).toLocaleString()}` } },
      },
    },
  });
}

function updateMaterialChart(transactions) {
  const ctx = document.getElementById('materialChart')?.getContext('2d');
  if (!ctx || !window.Chart) return;

  const grouped = groupTotals(transactions, row => row.material).slice(0, 8);
  const labels = grouped.length ? grouped.map(row => row[0]) : ['No data'];
  const values = grouped.length ? grouped.map(row => row[1]) : [0];

  if (adminIncomeMaterialChart) adminIncomeMaterialChart.destroy();
  adminIncomeMaterialChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: ['#2E7D32', '#43A047', '#66BB6A', '#A5D6A7', '#C8E6C9', '#E8F5E9', '#1B5E20', '#81C784'],
        borderWidth: 2,
        borderColor: '#fff',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { family: 'DM Sans', size: 12 }, boxWidth: 12 } } },
      cutout: '65%',
    },
  });
}

function updateRecentTransactions(transactions) {
  const list = document.getElementById('txList');
  if (!list) return;

  if (!transactions.length) {
    list.innerHTML = '<div class="activity-item"><div class="activity-left"><h4>No transactions yet</h4><p>Recorded transactions will appear here.</p></div></div>';
    return;
  }

  list.innerHTML = transactions.slice(0, 8).map(row => {
    const date = row.created_at ? new Date(row.created_at) : null;
    const time = date ? date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : '';
    return `
      <div class="activity-item">
        <div class="activity-left">
          <h4>${row.picker_name || 'Unknown picker'} <span style="font-weight:400;color:var(--text-soft);font-size:11px">${row.picker_id || ''}</span></h4>
          <p>${row.material || 'Material'} - ${Number(row.quantity || row.weight || 0).toLocaleString()} kg - ${time}</p>
        </div>
        <div class="activity-right"><div class="amount">${money(row.total || row.amount || 0)}</div></div>
      </div>`;
  }).join('');
}

async function loadAdminIncomeBoard() {
  const role = String(adminIncomeUser().role || '').toLowerCase();
  if (!['admin', 'superadmin'].includes(role)) {
    alert(`You are logged in as ${role || 'unknown'}, so you cannot open Admin.`);
    window.location.href = '../AuthScreens/user-selection.html';
    return;
  }

  try {
    const [transactionsData, summaryData] = await Promise.all([
      adminIncomeFetch('/transactions'),
      adminIncomeFetch('/transactions/summary'),
    ]);
    if (!transactionsData || !summaryData) return;

    const transactions = transactionsData.transactions || [];
    updateAdminIncomeStats(transactions, summaryData);
    updateCentreChart(transactions);
    updateMaterialChart(transactions);
    updateRecentTransactions(transactions);
  } catch (err) {
    console.error('Could not load admin income board:', err.message);
    updateAdminIncomeStats([], {});
    updateCentreChart([]);
    updateMaterialChart([]);
    updateRecentTransactions([]);
  }
}

window.addEventListener('load', () => {
  setTimeout(loadAdminIncomeBoard, 200);
});