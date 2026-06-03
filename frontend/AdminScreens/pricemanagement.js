const PRICE_API_URL = (() => {
  const h = window.location.hostname;
  return (!h || h === 'localhost' || h === '127.0.0.1') ? 'http://localhost:4000/api' : 'https://ecocycleprojectfinal-1.onrender.com/api';
})();

let activeCat = 'all';
let dbMaterials = [];
let editedPrices = new Map();

function getToken() {
  return localStorage.getItem('token');
}

function apiHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${getToken()}`,
    ...extra,
  };
}

function materialName(row) {
  return row.name || row.material || 'Material';
}

function materialPrice(row) {
  return Number(row.price_per_kg ?? row.pricePerKg ?? row.rate ?? 0);
}

function materialCategory(row) {
  const explicit = String(row.category || '').toLowerCase();
  if (explicit) return explicit;

  const name = materialName(row).toLowerCase();
  if (name.includes('plastic') || name.includes('pet') || name.includes('hdpe') || name.includes('pvc')) return 'plastic';
  if (name.includes('paper') || name.includes('cardboard') || name.includes('card')) return 'paper';
  if (name.includes('metal') || name.includes('aluminium') || name.includes('steel') || name.includes('copper')) return 'metal';
  if (name.includes('glass')) return 'glass';
  return 'other';
}

function materialIcon(row) {
  const category = materialCategory(row);
  if (category === 'plastic') return 'P';
  if (category === 'paper') return 'C';
  if (category === 'metal') return 'M';
  if (category === 'glass') return 'G';
  return 'O';
}

function materialBg(row) {
  const category = materialCategory(row);
  if (category === 'plastic') return '#E8F5E9';
  if (category === 'paper') return '#E3F2FD';
  if (category === 'metal') return '#FFF8E1';
  if (category === 'glass') return '#F3E5F5';
  return '#F5F5F5';
}

function currentPrice(row) {
  const id = String(row.id);
  return editedPrices.has(id) ? editedPrices.get(id) : materialPrice(row);
}

function money(value) {
  return Number(value || 0).toFixed(2);
}

function updateHint() {
  const hint = document.getElementById('changeHint');
  const label = document.getElementById('saveLabel');
  const count = editedPrices.size;

  if (!hint || !label) return;
  if (!count) {
    hint.textContent = 'No unsaved changes.';
    label.textContent = 'Save Changes';
    return;
  }

  hint.innerHTML = `<strong style="color:var(--amber)">${count} unsaved change${count > 1 ? 's' : ''}.</strong> Save to update the database.`;
  label.textContent = `Save ${count} Change${count > 1 ? 's' : ''}`;
}

async function fetchMaterials() {
  const response = await fetch(`${PRICE_API_URL}/materials`, {
    headers: apiHeaders(),
  });

  if (response.status === 401) {
    window.location.href = '../AuthScreens/login.html';
    return [];
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not load materials.');
  return data.materials || [];
}

function showMessage(message) {
  const hint = document.getElementById('changeHint');
  if (hint) hint.innerHTML = message;
}

async function fetchHistory(id) {
  const response = await fetch(`${PRICE_API_URL}/materials/${encodeURIComponent(id)}/history`, {
    headers: apiHeaders(),
  });
  const data = await response.json();
  if (!response.ok) return [];
  return data.history || [];
}

function renderPrices() {
  const search = document.getElementById('priceSearch');
  const priceList = document.getElementById('priceList');
  if (!priceList) return;

  const query = String(search?.value || '').toLowerCase();
  const list = dbMaterials.filter(row => {
    const category = materialCategory(row);
    const name = materialName(row).toLowerCase();
    return (activeCat === 'all' || category === activeCat) && (!query || name.includes(query));
  });

  if (!list.length) {
    priceList.innerHTML = `
      <div class="price-item">
        <div class="mat-info">
          <div class="mat-name">No materials found</div>
          <div class="mat-unit">Check the materials table in Supabase.</div>
        </div>
      </div>
    `;
    return;
  }

  priceList.innerHTML = list.map(row => {
    const id = String(row.id);
    const oldPrice = materialPrice(row);
    const price = currentPrice(row);
    const diff = price - oldPrice;
    const changeClass = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';
    const changeText = diff === 0 ? '-' : `${diff > 0 ? '+' : '-'} R ${money(Math.abs(diff))}`;

    return `
      <div class="price-item" id="item-${id}">
        <div class="mat-icon" style="background:${materialBg(row)}">${materialIcon(row)}</div>
        <div class="mat-info">
          <div class="mat-name">${materialName(row)}</div>
          <div class="mat-unit">Current database price: R ${money(oldPrice)} / ${row.unit || 'kg'}</div>
        </div>
        <div class="price-change ${changeClass}">${changeText}</div>
        <div class="price-input-wrap">
          <span class="currency-prefix">R</span>
          <input class="price-input" type="number" step="0.05" min="0"
                 value="${money(price)}"
                 onchange="updatePrice('${id}', this.value)"
                 onfocus="this.select()"/>
          <span class="per-unit">/ kg</span>
        </div>
        <button class="hist-btn" onclick="showHistory('${id}')" title="Price history">
          <svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/>
          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
        </button>
      </div>
    `;
  }).join('');
}

function updatePrice(id, value) {
  const row = dbMaterials.find(item => String(item.id) === String(id));
  if (!row) return;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    alert('Please enter a valid price.');
    renderPrices();
    return;
  }

  if (parsed === materialPrice(row)) {
    editedPrices.delete(String(id));
  } else {
    editedPrices.set(String(id), parsed);
  }

  updateHint();
  renderPrices();
}

async function saveChanges() {
  if (!editedPrices.size) {
    showMessage('Nothing to save. Change a price first, then click Save Changes.');
    return;
  }

  const changes = [...editedPrices.entries()];
  const saveButtons = document.querySelectorAll('button[onclick="saveChanges()"]');
  saveButtons.forEach(button => {
    button.disabled = true;
    button.style.opacity = '0.7';
  });

  try {
    for (const [id, price] of changes) {
      const response = await fetch(`${PRICE_API_URL}/materials/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ price_per_kg: price }),
      });

      const data = await response.json();
      if (response.status === 403) {
        throw new Error('Only an admin or super admin account can update prices. Log out, then log in with an admin account.');
      }
      if (response.status === 401) {
        window.location.href = '../AuthScreens/login.html';
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Could not save price.');
    }

    editedPrices.clear();
    dbMaterials = await fetchMaterials();
    renderPrices();
    updateHint();
    showMessage('<strong style="color:var(--primary)">Prices saved to the database successfully.</strong>');
  } catch (err) {
    showMessage(`<strong style="color:var(--red)">${err.message || 'Could not save prices.'}</strong>`);
  } finally {
    saveButtons.forEach(button => {
      button.disabled = false;
      button.style.opacity = '';
    });
  }
}

function resetAll() {
  editedPrices.clear();
  renderPrices();
  showMessage('Unsaved changes were reset back to the current database prices.');
}

function filterCat(button, category) {
  document.querySelectorAll('.cat-tab').forEach(tab => tab.classList.remove('active'));
  button.classList.add('active');
  activeCat = category;
  renderPrices();
}

async function showHistory(id) {
  const row = dbMaterials.find(item => String(item.id) === String(id));
  const history = await fetchHistory(id);

  document.getElementById('histTitle').textContent = `${materialName(row)} - Price History`;
  document.getElementById('histSub').textContent = history.length ? `${history.length} changes recorded` : 'No price changes recorded yet.';
  document.getElementById('histBody').innerHTML = history.length
    ? history.map(item => `
        <div class="hist-row">
          <span style="color:var(--text-soft);font-size:12px">${new Date(item.changed_at).toLocaleDateString()}</span>
          <span><span class="hist-old">R ${money(item.old_price)}</span>
          &nbsp;to&nbsp;<span class="hist-new">R ${money(item.new_price)}</span></span>
        </div>`).join('')
    : '<p style="color:var(--text-soft);font-size:13px;padding:12px 0">No history available.</p>';

  document.getElementById('histModal').classList.add('open');
}

function closeModal() {
  document.getElementById('histModal')?.classList.remove('open');
}

async function loadPriceManagement() {
  try {
    dbMaterials = await fetchMaterials();
    renderPrices();
    updateHint();

    const badge = document.querySelector('.updated-badge');
    if (badge) badge.textContent = `Loaded from database: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    document.querySelectorAll('button').forEach(button => {
      const action = button.getAttribute('onclick') || '';
      if (action.includes('saveChanges')) {
        button.onclick = event => {
          event.preventDefault();
          saveChanges();
        };
      }
      if (action.includes('resetAll')) {
        button.onclick = event => {
          event.preventDefault();
          resetAll();
        };
      }
    });
  } catch (err) {
    const priceList = document.getElementById('priceList');
    if (priceList) {
      priceList.innerHTML = `
        <div class="price-item">
          <div class="mat-info">
            <div class="mat-name">Could not load prices</div>
            <div class="mat-unit">${err.message}</div>
          </div>
        </div>
      `;
    }
  }
}

window.renderPrices = renderPrices;
window.updatePrice = updatePrice;
window.saveChanges = saveChanges;
window.resetAll = resetAll;
window.filterCat = filterCat;
window.showHistory = showHistory;
window.closeModal = closeModal;

document.addEventListener('DOMContentLoaded', loadPriceManagement);
