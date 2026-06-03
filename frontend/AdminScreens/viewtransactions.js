const VIEW_TX_API_URL = (() => {
  const h = window.location.hostname;
  return (!h || h === 'localhost' || h === '127.0.0.1') ? 'http://localhost:4000/api' : 'https://ecocycleprojectfinal-1.onrender.com/api';
})();

let viewTransactions = [];
let filteredTransactions = [];

function viewTxToken() {
  return localStorage.getItem('token');
}

function viewTxUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
}

async function viewTxFetch(path) {
  const response = await fetch(`${VIEW_TX_API_URL}${path}`, {
    headers: { 'Authorization': `Bearer ${viewTxToken()}` },
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

function initials(name) {
  return String(name || 'Unknown')
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(value) {
  if (!value) return { date: '-', time: '' };
  const date = new Date(value);
  return {
    date: date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
  };
}

function normalizeStatus(status) {
  const value = String(status || 'completed').toLowerCase();
  if (value === 'paid') return 'completed';
  if (value === 'review') return 'processing';
  return value;
}

function materialLabel(material) {
  const text = String(material || 'Material');
  return text
    .replace('Plastic (PET)', 'PET Plastic')
    .replace('Plastic (HDPE)', 'HDPE Plastic')
    .replace('Paper / Cardboard', 'Cardboard')
    .replace('Metal (Aluminium)', 'Aluminium');
}

function toRow(transaction) {
  const date = formatDate(transaction.created_at);
  return {
    id: transaction.id || '-',
    date: date.date,
    time: date.time,
    picker: transaction.picker_name || transaction.picker_id || 'Unknown picker',
    initials: initials(transaction.picker_name || transaction.picker_id),
    pickerId: transaction.picker_id || '',
    material: materialLabel(transaction.material),
    kg: Number(transaction.quantity || transaction.weight || 0),
    amt: Number(transaction.total || transaction.amount || 0),
    status: normalizeStatus(transaction.status),
  };
}

function updateSummary(transactions, summary) {
  const values = document.querySelectorAll('.sp-val');
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);

  const monthTransactions = transactions.filter(transaction => {
    if (!transaction.created_at) return false;
    return new Date(transaction.created_at) >= thisMonthStart;
  });

  const monthRevenue = monthTransactions.reduce((sum, row) => sum + Number(row.total || row.amount || 0), 0);
  const pending = transactions.filter(row => normalizeStatus(row.status) === 'pending').length;
  const rejected = transactions.filter(row => normalizeStatus(row.status) === 'rejected').length;

  if (values[0]) values[0].textContent = monthTransactions.length.toLocaleString();
  if (values[1]) values[1].textContent = money(monthRevenue);
  if (values[2]) values[2].textContent = pending.toLocaleString();
  if (values[3]) values[3].textContent = rejected.toLocaleString();

  const labels = document.querySelectorAll('.sp-lbl');
  if (labels[0]) labels[0].textContent = `${summary?.totalTransactions || transactions.length || 0} total transactions`;
  if (labels[1]) labels[1].textContent = 'Revenue this month';
}

function updateMaterialFilter(rows) {
  const select = document.getElementById('materialFilter');
  if (!select) return;

  const current = select.value;
  const materials = [...new Set(rows.map(row => row.material).filter(Boolean))].sort();
  select.innerHTML = '<option value="">All Materials</option>' +
    materials.map(material => `<option value="${material}">${material}</option>`).join('');
  select.value = materials.includes(current) ? current : '';
}

function statusClass(status) {
  return {
    completed: 'badge-completed',
    pending: 'badge-pending',
    rejected: 'badge-rejected',
    processing: 'badge-processing',
  }[status] || 'badge-completed';
}

function statusLabel(status) {
  return {
    completed: 'Completed',
    pending: 'Pending',
    rejected: 'Rejected',
    processing: 'Processing',
  }[status] || 'Completed';
}

function renderRows(data) {
  const body = document.getElementById('txBody');
  const info = document.getElementById('paginInfo');
  if (!body) return;

  if (!data.length) {
    body.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-soft)">No transactions match your filters.</td></tr>';
    if (info) info.textContent = 'Showing 0 results';
    return;
  }

  body.innerHTML = data.map(row => `
    <tr>
      <td><span class="tx-id">${row.id}</span></td>
      <td><div style="font-size:12px;font-weight:500">${row.date}</div><div class="tx-date">${row.time}</div></td>
      <td>
        <div class="picker-cell">
          <div class="picker-av-sm">${row.initials}</div>
          <div style="min-width:0">
            <div class="picker-nm">${row.picker}</div>
            <div class="picker-id-sm">${row.pickerId}</div>
          </div>
        </div>
      </td>
      <td><span class="material-tag">${row.material}</span></td>
      <td style="font-weight:600;font-size:13px">${row.kg.toLocaleString('en-ZA')}</td>
      <td><span class="amt">${money(row.amt)}</span></td>
      <td><span class="badge ${statusClass(row.status)}">${statusLabel(row.status)}</span></td>
      <td>
        <button class="view-btn" title="View details" onclick="alert('Transaction: ${row.id}\\nPicker: ${row.picker}\\nAmount: ${money(row.amt)}')">
          <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </td>
    </tr>`).join('');

  if (info) info.textContent = `Showing 1-${data.length} of ${data.length} transactions`;
}

function filterTable() {
  const query = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const status = document.getElementById('statusFilter')?.value || '';
  const material = document.getElementById('materialFilter')?.value || '';

  filteredTransactions = viewTransactions.filter(row =>
    (!query || row.id.toLowerCase().includes(query) || row.picker.toLowerCase().includes(query) || row.material.toLowerCase().includes(query)) &&
    (!status || row.status === status) &&
    (!material || row.material === material)
  );

  renderRows(filteredTransactions);
}

function exportCsv() {
  const rows = filteredTransactions.length ? filteredTransactions : viewTransactions;
  const header = ['Txn ID', 'Date', 'Time', 'Picker', 'Picker ID', 'Material', 'Weight kg', 'Amount', 'Status'];
  const csv = [
    header.join(','),
    ...rows.map(row => [
      row.id,
      row.date,
      row.time,
      row.picker,
      row.pickerId,
      row.material,
      row.kg,
      row.amt,
      row.status,
    ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ecocycle-transactions.csv';
  link.click();
  URL.revokeObjectURL(url);
}

async function loadTransactions() {
  const userRole = String(viewTxUser().role || '').toLowerCase();
  if (!['admin', 'superadmin'].includes(userRole)) {
    alert(`You are logged in as ${userRole || 'unknown'}, so you cannot open Admin.`);
    window.location.href = '../AuthScreens/user-selection.html';
    return;
  }

  try {
    const [transactionsData, summaryData] = await Promise.all([
      viewTxFetch('/transactions'),
      viewTxFetch('/transactions/summary'),
    ]);
    if (!transactionsData) return;

    const rawTransactions = transactionsData.transactions || [];
    viewTransactions = rawTransactions.map(toRow);
    filteredTransactions = [...viewTransactions];

    updateSummary(rawTransactions, summaryData);
    updateMaterialFilter(viewTransactions);
    renderRows(filteredTransactions);
  } catch (err) {
    console.error('Could not load transactions:', err.message);
    viewTransactions = [];
    filteredTransactions = [];
    renderRows([]);
  }
}

function wireViewTransactionsPage() {
  const search = document.getElementById('searchInput');
  const status = document.getElementById('statusFilter');
  const material = document.getElementById('materialFilter');
  const exportButton = document.querySelector('.export-btn');
  const newButton = document.querySelector('.btn-primary');
  const logoutButton = document.querySelector('.topbar-logout');

  if (search) search.oninput = filterTable;
  if (status) status.onchange = filterTable;
  if (material) material.onchange = filterTable;
  if (exportButton) exportButton.onclick = exportCsv;
  if (newButton) newButton.onclick = () => window.location.href = '../UserScreens/RecordTransaction_Employee.html';
  if (logoutButton) {
    logoutButton.onclick = event => {
      event.preventDefault();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '../AuthScreens/login.html';
    };
  }
}

window.filterTable = filterTable;

window.addEventListener('load', () => {
  wireViewTransactionsPage();
  loadTransactions();
});