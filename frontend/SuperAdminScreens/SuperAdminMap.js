const API_URL = 'http://localhost:4000/api';

function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

async function fetchJson(path) {
  const response = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
  if (response.status === 401) {
    window.location.href = '../AuthScreens/login.html';
    return null;
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not load map data.');
  return data;
}

function formatKg(value) {
  const kg = Number(value || 0);
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)} tons` : `${Math.round(kg).toLocaleString()} kg`;
}

function clearMapPlaceholder() {
  const mapEl = document.getElementById('map');
  if (!mapEl) return null;
  mapEl.innerHTML = '';
  mapEl.style.display = 'block';
  mapEl.style.background = '#eef5ef';
  mapEl.style.border = '1px solid #dfe7dd';
  mapEl.style.overflow = 'hidden';
  mapEl.style.cursor = 'grab';
  mapEl.style.touchAction = 'none';
  mapEl.style.pointerEvents = 'auto';
  return mapEl;
}

function southAfricaCenter() {
  return { lat: -26.2041, lng: 28.0473 };
}

function validSouthAfricaPoint(point) {
  const lat = Number(point?.lat);
  const lng = Number(point?.lng);
  return Number.isFinite(lat)
    && Number.isFinite(lng)
    && lat >= -35
    && lat <= -22
    && lng >= 16
    && lng <= 33;
}

function usableMapRows(rows) {
  return (rows || []).filter(validSouthAfricaPoint);
}

function updateStats(summary) {
  const values = document.querySelectorAll('.stat-card .value');
  const captions = document.querySelectorAll('.stat-card .caption');

  if (values[0]) values[0].textContent = Number(summary.activePickers || 0).toLocaleString();
  if (values[1]) values[1].textContent = formatKg(summary.todayKg || summary.totalKg || 0);
  if (values[2]) values[2].textContent = Number(summary.activeDepots || 0).toLocaleString();
  if (values[3]) values[3].textContent = Number(summary.criticalAlerts || 0).toLocaleString();

  if (captions[0]) captions[0].textContent = 'From database';
  if (captions[1]) captions[1].textContent = 'Recorded today';
  if (captions[2]) captions[2].textContent = 'Branches in Supabase';
  if (captions[3]) captions[3].textContent = 'Low activity regions';
}

function updateRegionActivity(regions) {
  const rows = document.querySelectorAll('.region-item');
  const maxKg = Math.max(...regions.map(region => Number(region.kg || 0)), 1);

  rows.forEach((row, index) => {
    const region = regions[index];
    if (!region) {
      row.style.display = 'none';
      return;
    }
    row.style.display = '';
    const label = row.querySelector('.health-label');
    const sub = row.querySelector('.health-sub');
    const bar = row.querySelector('.region-bar');
    const value = row.querySelector('.health-value');

    if (label) label.textContent = region.name;
    if (sub) sub.textContent = `${region.activePickers || region.pickers || 0} active pickers - ${region.transactions || 0} transactions`;
    if (value) value.textContent = formatKg(region.kg);
    if (bar) bar.style.width = `${Math.max(4, Math.round((Number(region.kg || 0) / maxKg) * 100))}%`;
  });
}

function popupHtml(title, rows) {
  return `
    <div style="font-family:DM Sans,Arial,sans-serif;min-width:190px">
      <strong style="font-family:Sora,Arial,sans-serif;font-size:14px">${title}</strong>
      ${rows.map(([label, value]) => `
        <div style="display:flex;justify-content:space-between;gap:18px;margin-top:8px;font-size:13px">
          <span style="color:#6b7280">${label}</span>
          <strong>${value}</strong>
        </div>
      `).join('')}
    </div>
  `;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function loadStyle(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function enableTouchpadPan(map, panBy) {
  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  mapEl.addEventListener('wheel', event => {
    event.preventDefault();
    event.stopPropagation();
    panBy(event.deltaX, event.deltaY);
  }, { passive: false });
}

function renderGoogleMap(data, apiKey) {
  const regions = usableMapRows(data.regions);
  const pickers = usableMapRows(data.pickers);
  const center = regions[0] || pickers[0] || southAfricaCenter();
  const map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: Number(center.lat), lng: Number(center.lng) },
    zoom: 11,
    minZoom: 5,
    gestureHandling: 'greedy',
    scrollwheel: false,
    draggable: true,
    draggableCursor: 'grab',
    draggingCursor: 'grabbing',
    keyboardShortcuts: true,
    disableDoubleClickZoom: false,
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: true,
  });

  const bounds = new google.maps.LatLngBounds();
  const info = new google.maps.InfoWindow();

  regions.forEach(region => {
    const position = { lat: Number(region.lat), lng: Number(region.lng) };
    bounds.extend(position);
    const marker = new google.maps.Marker({
      map,
      position,
      title: region.name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 13,
        fillColor: region.color || '#2E7D32',
        fillOpacity: 0.95,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
    });
    marker.addListener('click', () => {
      info.setContent(popupHtml(region.name, [
        ['Active pickers', region.activePickers || region.pickers || 0],
        ['Total collected', formatKg(region.kg)],
        ['Today', formatKg(region.todayKg)],
        ['Transactions', region.transactions || 0],
      ]));
      info.open(map, marker);
    });
  });

  pickers.slice(0, 150).forEach(picker => {
    const position = { lat: Number(picker.lat), lng: Number(picker.lng) };
    bounds.extend(position);
    const marker = new google.maps.Marker({
      map,
      position,
      title: picker.name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: '#1E88E5',
        fillOpacity: 0.8,
        strokeColor: '#ffffff',
        strokeWeight: 1,
      },
    });
    marker.addListener('click', () => {
      info.setContent(popupHtml(picker.name, [
        ['Branch', picker.branch || 'Unassigned'],
        ['Status', picker.status || 'active'],
        ['Collected', formatKg(picker.totalKg)],
      ]));
      info.open(map, marker);
    });
  });

  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, 48);
    google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
      if (map.getZoom() < 6) map.setZoom(6);
      if (map.getZoom() > 14) map.setZoom(14);
    });
  }

  enableTouchpadPan(map, (deltaX, deltaY) => {
    map.panBy(deltaX, deltaY);
  });
}

async function renderLeafletMap(data) {
  loadStyle('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
  await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');

  const regions = usableMapRows(data.regions);
  const pickers = usableMapRows(data.pickers);
  const center = regions[0] || pickers[0] || southAfricaCenter();
  const map = L.map('map', {
    zoomControl: true,
    scrollWheelZoom: true,
    dragging: true,
    touchZoom: true,
    doubleClickZoom: true,
    boxZoom: true,
    keyboard: true,
    minZoom: 5,
  }).setView([center.lat, center.lng], 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
  }).addTo(map);

  const bounds = [];

  regions.forEach(region => {
    const latLng = [Number(region.lat), Number(region.lng)];
    bounds.push(latLng);
    L.circleMarker(latLng, {
      radius: 12,
      color: '#ffffff',
      weight: 3,
      fillColor: region.color || '#2E7D32',
      fillOpacity: 0.95,
    })
      .bindPopup(popupHtml(region.name, [
        ['Active pickers', region.activePickers || region.pickers || 0],
        ['Total collected', formatKg(region.kg)],
        ['Today', formatKg(region.todayKg)],
        ['Transactions', region.transactions || 0],
      ]))
      .addTo(map);
  });

  pickers.slice(0, 150).forEach(picker => {
    const latLng = [Number(picker.lat), Number(picker.lng)];
    bounds.push(latLng);
    L.circleMarker(latLng, {
      radius: 5,
      color: '#ffffff',
      weight: 1,
      fillColor: '#1E88E5',
      fillOpacity: 0.85,
    })
      .bindPopup(popupHtml(picker.name, [
        ['Branch', picker.branch || 'Unassigned'],
        ['Status', picker.status || 'active'],
        ['Collected', formatKg(picker.totalKg)],
      ]))
      .addTo(map);
  });

  if (bounds.length) {
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
    if (map.getZoom() < 6) map.setZoom(6);
  }

  enableTouchpadPan(map, (deltaX, deltaY) => {
    map.panBy([deltaX, deltaY], { animate: false });
  });
}

async function loadMapPage() {
  const mapEl = clearMapPlaceholder();
  if (!mapEl) return;

  try {
    const [data, config] = await Promise.all([
      fetchJson('/locations'),
      fetchJson('/locations/map-config'),
    ]);

    if (!data) return;
    updateStats(data.summary || {});
    updateRegionActivity(data.regions || []);

    if (config?.provider === 'google' && config.googleMapsApiKey) {
      try {
        await loadScript(`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(config.googleMapsApiKey)}`);
        renderGoogleMap(data, config.googleMapsApiKey);
        return;
      } catch (err) {
        console.warn('Google Maps could not load, using OpenStreetMap fallback:', err.message);
      }
    }

    await renderLeafletMap(data);
  } catch (err) {
    console.error('[superadmin.map]', err.message);
    mapEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#b91c1c;font-weight:700">Could not load map data.</div>`;
  }
}

document.addEventListener('DOMContentLoaded', loadMapPage);
