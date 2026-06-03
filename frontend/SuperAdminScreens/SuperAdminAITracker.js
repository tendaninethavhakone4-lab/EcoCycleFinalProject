const AI_TRACKER_API_URL = 'http://localhost:4000/api';

let aiTrendChart = null;

function aiToken() {
  return localStorage.getItem('token');
}

async function aiFetch(path) {
  const response = await fetch(`${AI_TRACKER_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${aiToken()}` },
  });

  if (response.status === 401) {
    window.location.href = '../AuthScreens/login.html';
    return null;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not load AI trend data.');
  return data;
}

function normalizeRole(role) {
  return String(role || '').toLowerCase().replace(/[\s_-]/g, '');
}

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
}

function kg(row) {
  return Number(row.quantity ?? row.weight ?? 0);
}

function weekStart(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - result.getDay());
  return result;
}

function buildFourWeeks() {
  const current = weekStart(new Date());
  return [3, 2, 1, 0].map(offset => {
    const start = new Date(current);
    start.setDate(start.getDate() - offset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return {
      label: offset === 0 ? 'This week' : `${offset} wk ago`,
      start,
      end,
      totals: {},
    };
  });
}

function materialColor(index) {
  return ['#2E7D32', '#1565C0', '#F59E0B', '#66BB6A', '#8D6E63', '#546E7A'][index % 6];
}

function buildTrendData(transactions) {
  const weeks = buildFourWeeks();
  const materialTotals = {};

  transactions.forEach(row => {
    const created = row.created_at ? new Date(row.created_at) : null;
    if (!created || Number.isNaN(created.getTime())) return;

    const bucket = weeks.find(week => created >= week.start && created < week.end);
    if (!bucket) return;

    const material = row.material || 'Unknown';
    const weight = kg(row);
    bucket.totals[material] = (bucket.totals[material] || 0) + weight;
    materialTotals[material] = (materialTotals[material] || 0) + weight;
  });

  const materials = Object.entries(materialTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([material]) => material);

  return { weeks, materials };
}

function percentChange(start, end) {
  if (!start && !end) return 0;
  if (!start) return 100;
  return ((end - start) / start) * 100;
}

function trendType(change) {
  if (change >= 10) return 'up';
  if (change <= -10) return 'down';
  return 'flat';
}

function trendNote(material, change, currentVolume) {
  if (!currentVolume) return `No recent ${material} transactions were recorded.`;
  if (change >= 25) return 'Fast growth detected. Consider increasing collection capacity and pickup scheduling.';
  if (change >= 10) return 'Upward trend detected. Monitor demand and keep pricing attractive.';
  if (change <= -25) return 'Sharp decline detected. Review collection areas, pricing, or picker availability.';
  if (change <= -10) return 'Declining trend detected. Check whether fewer transactions are being recorded.';
  return 'Stable trend. Current operations appear consistent.';
}

function renderChart(transactions) {
  const ctx = document.getElementById('trendChart')?.getContext('2d');
  const legend = document.getElementById('chartLegend');
  if (!ctx || !window.Chart) return;

  const { weeks, materials } = buildTrendData(transactions);
  const chartMaterials = materials.length ? materials : ['No data'];

  const datasets = chartMaterials.map((material, index) => ({
    label: `${material} (kg)`,
    data: weeks.map(week => Number((week.totals[material] || 0).toFixed(2))),
    borderColor: materialColor(index),
    backgroundColor: 'transparent',
    pointBackgroundColor: materialColor(index),
    pointRadius: 4,
    pointHoverRadius: 6,
    borderWidth: 2,
    tension: 0.3,
  }));

  if (aiTrendChart) aiTrendChart.destroy();
  aiTrendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: weeks.map(week => week.label),
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#fff',
          titleColor: '#1a1a1a',
          bodyColor: '#7a7a7a',
          borderColor: '#ebebeb',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: item => `  ${item.dataset.label}: ${Number(item.parsed.y || 0).toLocaleString()} kg`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#7a7a7a', font: { family: 'DM Sans', size: 12 } },
          border: { display: false },
        },
        y: {
          beginAtZero: true,
          grid: { color: '#f0f0f0' },
          ticks: {
            color: '#7a7a7a',
            font: { family: 'DM Sans', size: 12 },
            callback: value => Number(value).toLocaleString(),
          },
          border: { display: false },
        },
      },
    },
  });

  if (legend) {
    legend.innerHTML = chartMaterials.map((material, index) => `
      <div class="legend-item">
        <div class="legend-dot" style="background:${materialColor(index)}"></div>
        <span>${material} (kg)</span>
      </div>
    `).join('');
  }
}

function trendIcon(type) {
  if (type === 'up') {
    return '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>';
  }
  if (type === 'down') {
    return '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>';
  }
  return '<line x1="5" y1="12" x2="19" y2="12"/>';
}

function renderInsights(transactions) {
  const sectionCards = document.querySelectorAll('.section-card');
  const insightsCard = sectionCards[1];
  if (!insightsCard) return;

  const { weeks, materials } = buildTrendData(transactions);
  const rows = materials.map(material => {
    const first = weeks[0].totals[material] || 0;
    const last = weeks[3].totals[material] || 0;
    const change = percentChange(first, last);
    return {
      material,
      currentVolume: last,
      change,
      type: trendType(change),
      note: trendNote(material, change, last),
    };
  });

  insightsCard.innerHTML = `
    <div class="section-title">AI-Generated Insights</div>
    ${rows.length ? rows.map(row => `
      <div class="insight-item" data-trend="${row.type}">
        <div class="insight-left">
          <div class="insight-icon ${row.type}">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              ${trendIcon(row.type)}
            </svg>
          </div>
          <div class="insight-body">
            <div class="insight-name">${row.material}</div>
            <div class="insight-volume">Current volume: ${Math.round(row.currentVolume).toLocaleString()} kg</div>
            <div class="insight-note">
              <svg class="note-icon" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              ${row.note}
            </div>
          </div>
        </div>
        <div class="insight-badge ${row.type}">${row.change >= 0 ? '+' : '-'}${Math.abs(row.change).toFixed(1)}%<span>4-Week Change</span></div>
      </div>
    `).join('') : `
      <div class="insight-item" data-trend="flat">
        <div class="insight-left">
          <div class="insight-icon flat">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              ${trendIcon('flat')}
            </svg>
          </div>
          <div class="insight-body">
            <div class="insight-name">No transaction trends yet</div>
            <div class="insight-volume">Current volume: 0 kg</div>
            <div class="insight-note">
              <svg class="note-icon" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Record transactions first, then trend insights will appear here.
            </div>
          </div>
        </div>
        <div class="insight-badge flat">0.0%<span>4-Week Change</span></div>
      </div>
    `}
  `;
}

async function loadAITracker() {
  const role = normalizeRole(currentUser().role);
  if (role && role !== 'superadmin') {
    alert('You are not logged in as Super Admin.');
    window.location.href = '../AuthScreens/user-selection.html';
    return;
  }

  try {
    const data = await aiFetch('/transactions');
    const transactions = data?.transactions || [];
    renderChart(transactions);
    renderInsights(transactions);
  } catch (err) {
    console.error('[superadmin.ai-tracker]', err.message);
    renderChart([]);
    renderInsights([]);
  }
}

document.addEventListener('DOMContentLoaded', loadAITracker);
