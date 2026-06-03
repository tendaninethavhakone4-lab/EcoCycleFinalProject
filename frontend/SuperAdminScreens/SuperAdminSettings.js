const API_URL = (() => {
  const h = window.location.hostname;
  return (!h || h === 'localhost' || h === '127.0.0.1') ? 'http://localhost:4000/api' : '/api';
})();

function token() {
  return localStorage.getItem('token');
}

function normalizeRole(role) {
  return String(role || '').toLowerCase().replace(/[\s_-]/g, '');
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
}

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${token()}`, ...extra };
}

async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: authHeaders({
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    }),
  });

  if (response.status === 401) {
    window.location.href = '../AuthScreens/login.html';
    return null;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

function toast(message, type = 'ok') {
  let box = document.getElementById('saSettingsToast');
  if (!box) {
    box = document.createElement('div');
    box.id = 'saSettingsToast';
    box.style.cssText = 'position:fixed;right:24px;bottom:24px;z-index:9999;padding:14px 18px;border-radius:12px;color:#fff;font-weight:700;font-family:DM Sans,sans-serif;box-shadow:0 12px 30px rgba(0,0,0,.22);max-width:420px';
    document.body.appendChild(box);
  }
  box.style.background = type === 'error' ? '#ef4444' : '#1f2937';
  box.textContent = message;
  clearTimeout(box._timer);
  box._timer = setTimeout(() => { box.remove(); }, 3500);
}

function initials(name) {
  return String(name || 'SA')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'SA';
}

function showSection(id) {
  document.querySelectorAll('[id^="section-"]').forEach(el => { el.style.display = 'none'; });
  const el = document.getElementById(`section-${id}`);
  if (el) el.style.display = 'block';

  document.querySelectorAll('.settings-nav-item').forEach(item => {
    item.classList.remove('active');
    if ((item.getAttribute('onclick') || '').includes(`'${id}'`)) item.classList.add('active');
  });
}

window.showSection = showSection;

function profileInputs() {
  const section = document.getElementById('section-profile');
  return {
    section,
    name: section?.querySelector('input[type="text"]'),
    email: section?.querySelector('input[type="email"]'),
    phone: section?.querySelector('input[type="tel"]'),
    save: Array.from(section?.querySelectorAll('button') || []).find(button => /save/i.test(button.textContent)),
    cancel: Array.from(section?.querySelectorAll('button') || []).find(button => /cancel/i.test(button.textContent)),
    photo: section?.querySelector('.change-photo-btn'),
  };
}

function applyProfile(user) {
  if (!user) return;
  const inputs = profileInputs();
  const avatar = document.querySelector('.profile-avatar');
  const nameText = document.querySelector('.profile-name');
  const roleText = document.querySelector('.profile-role');
  const profileId = document.querySelector('.profile-id');

  if (inputs.name) inputs.name.value = user.name || '';
  if (inputs.email) inputs.email.value = user.email || '';
  if (inputs.phone) inputs.phone.value = user.phone || '';
  if (nameText) nameText.textContent = user.name || 'Super Admin';
  if (roleText) roleText.textContent = `${user.role || 'Super Admin'} - Full system access`;
  if (profileId) profileId.textContent = `${user.id || 'SA-0001'} - Super Admin`;

  if (avatar) {
    avatar.textContent = initials(user.name);
    if (user.photo_url || user.photo) {
      avatar.style.backgroundImage = `url("${user.photo_url || user.photo}")`;
      avatar.style.backgroundSize = 'cover';
      avatar.style.backgroundPosition = 'center';
      avatar.style.color = 'transparent';
    }
  }
}

async function loadProfile() {
  const data = await api('/auth/me');
  if (!data) return;
  applyProfile(data.user);
  localStorage.setItem('user', JSON.stringify(data.user));
}

async function saveProfile() {
  const inputs = profileInputs();
  try {
    const data = await api('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({
        name: inputs.name?.value || '',
        email: inputs.email?.value || '',
        phone: inputs.phone?.value || '',
      }),
    });
    if (!data) return;
    applyProfile(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
    toast('Profile saved to database.');
  } catch (err) {
    toast(err.message, 'error');
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadPhoto(file) {
  if (!file) return;
  try {
    const image = await readFileAsDataUrl(file);
    const data = await api('/auth/profile/photo', {
      method: 'POST',
      body: JSON.stringify({ image, fileName: file.name }),
    });
    if (!data) return;
    applyProfile(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
    toast('Profile photo uploaded.');
  } catch (err) {
    toast(err.message, 'error');
  }
}

function choosePhoto() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = () => uploadPhoto(input.files?.[0]);
  input.click();
}

function passwordModal() {
  let overlay = document.getElementById('passwordModal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'passwordModal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.38);z-index:9998;display:none;align-items:center;justify-content:center';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:14px;padding:22px;width:min(420px,92vw);font-family:DM Sans,sans-serif;box-shadow:0 18px 50px rgba(0,0,0,.28)">
        <h3 style="font-family:Sora,sans-serif;margin-bottom:12px">Change Password</h3>
        <input id="currentPasswordInput" type="password" placeholder="Current password" style="width:100%;padding:11px 12px;margin-bottom:10px;border:1px solid #ddd;border-radius:8px">
        <input id="newPasswordInput" type="password" placeholder="New password" style="width:100%;padding:11px 12px;margin-bottom:14px;border:1px solid #ddd;border-radius:8px">
        <div style="display:flex;justify-content:flex-end;gap:8px">
          <button id="cancelPasswordBtn" class="btn btn-ghost">Cancel</button>
          <button id="savePasswordBtn" class="btn btn-primary">Update Password</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#cancelPasswordBtn').onclick = () => { overlay.style.display = 'none'; };
    overlay.querySelector('#savePasswordBtn').onclick = changePassword;
  }
  overlay.style.display = 'flex';
}

async function changePassword() {
  const overlay = document.getElementById('passwordModal');
  const currentPassword = document.getElementById('currentPasswordInput')?.value || '';
  const newPassword = document.getElementById('newPasswordInput')?.value || '';

  try {
    await api('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (overlay) overlay.style.display = 'none';
    toast('Password changed successfully.');
  } catch (err) {
    toast(err.message, 'error');
  }
}

function renderAdmins(users) {
  const tbody = document.querySelector('#section-admins tbody');
  const desc = document.querySelector('#section-admins .settings-card-desc');
  if (!tbody) return;

  const admins = (users || []).filter(user => ['admin', 'superadmin'].includes(normalizeRole(user.role)));
  if (desc) desc.textContent = `${admins.length} admin accounts from database`;

  window.superAdminUsers = admins;

  tbody.innerHTML = admins.length ? admins.map(user => `
    <tr>
      <td><div class="admin-name">${user.name || 'Unnamed user'}</div><div class="admin-email">${user.email || ''}</div></td>
      <td>${user.branch || 'All regions'}</td>
      <td><span class="role-pill ${normalizeRole(user.role) === 'superadmin' ? 'superadmin' : 'admin'}">${user.role || 'admin'}</span></td>
      <td><span class="status-dot ${user.status === 'active' ? 'active' : 'inactive'}"></span>${user.status || 'active'}</td>
      <td class="action-btns">
        <button class="icon-btn" title="Edit admin" onclick="openAdminModal('${user.id}')">Edit</button>
        <button class="icon-btn danger" title="Deactivate admin" onclick="deactivateAdmin('${user.id}')">Off</button>
      </td>
    </tr>
  `).join('') : `
    <tr><td colspan="5">No admin accounts found in the database.</td></tr>
  `;
}

function adminModal() {
  let overlay = document.getElementById('adminModal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'adminModal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.38);z-index:9998;display:none;align-items:center;justify-content:center';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:14px;padding:22px;width:min(480px,92vw);font-family:DM Sans,sans-serif;box-shadow:0 18px 50px rgba(0,0,0,.28)">
        <h3 id="adminModalTitle" style="font-family:Sora,sans-serif;margin-bottom:12px">Add Admin</h3>
        <input id="adminIdInput" type="hidden">
        <label style="font-size:12px;font-weight:700">Name</label>
        <input id="adminNameInput" type="text" style="width:100%;padding:10px 12px;margin:4px 0 10px;border:1px solid #ddd;border-radius:8px">
        <label style="font-size:12px;font-weight:700">Email</label>
        <input id="adminEmailInput" type="email" style="width:100%;padding:10px 12px;margin:4px 0 10px;border:1px solid #ddd;border-radius:8px">
        <label style="font-size:12px;font-weight:700">Phone</label>
        <input id="adminPhoneInput" type="tel" style="width:100%;padding:10px 12px;margin:4px 0 10px;border:1px solid #ddd;border-radius:8px">
        <label style="font-size:12px;font-weight:700">Branch / Region</label>
        <input id="adminBranchInput" type="text" placeholder="All regions" style="width:100%;padding:10px 12px;margin:4px 0 10px;border:1px solid #ddd;border-radius:8px">
        <label style="font-size:12px;font-weight:700">Role</label>
        <select id="adminRoleInput" style="width:100%;padding:10px 12px;margin:4px 0 10px;border:1px solid #ddd;border-radius:8px">
          <option value="admin">Admin</option>
          <option value="superadmin">Super Admin</option>
        </select>
        <label id="adminPasswordLabel" style="font-size:12px;font-weight:700">Temporary Password</label>
        <input id="adminPasswordInput" type="text" placeholder="Leave blank to auto-generate" style="width:100%;padding:10px 12px;margin:4px 0 14px;border:1px solid #ddd;border-radius:8px">
        <div style="display:flex;justify-content:flex-end;gap:8px">
          <button id="cancelAdminBtn" class="btn btn-ghost">Cancel</button>
          <button id="saveAdminBtn" class="btn btn-primary">Save Admin</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#cancelAdminBtn').onclick = () => { overlay.style.display = 'none'; };
    overlay.querySelector('#saveAdminBtn').onclick = saveAdmin;
  }
  return overlay;
}

function setAdminForm(user = null) {
  document.getElementById('adminIdInput').value = user?.id || '';
  document.getElementById('adminNameInput').value = user?.name || '';
  document.getElementById('adminEmailInput').value = user?.email || '';
  document.getElementById('adminPhoneInput').value = user?.phone || '';
  document.getElementById('adminBranchInput').value = user?.branch || '';
  document.getElementById('adminRoleInput').value = normalizeRole(user?.role) === 'superadmin' ? 'superadmin' : 'admin';
  document.getElementById('adminPasswordInput').value = '';
  document.getElementById('adminPasswordInput').style.display = user ? 'none' : '';
  document.getElementById('adminPasswordLabel').style.display = user ? 'none' : '';
  document.getElementById('adminModalTitle').textContent = user ? 'Edit Admin' : 'Add Admin';
}

function openAdminModal(id = '') {
  const overlay = adminModal();
  const user = id ? (window.superAdminUsers || []).find(item => String(item.id) === String(id)) : null;
  setAdminForm(user);
  overlay.style.display = 'flex';
}

window.openAdminModal = openAdminModal;

async function saveAdmin() {
  const id = document.getElementById('adminIdInput').value;
  const body = {
    name: document.getElementById('adminNameInput').value,
    email: document.getElementById('adminEmailInput').value,
    phone: document.getElementById('adminPhoneInput').value,
    branch: document.getElementById('adminBranchInput').value,
    role: document.getElementById('adminRoleInput').value,
  };

  if (!id) {
    const password = document.getElementById('adminPasswordInput').value;
    if (password) body.password = password;
  }

  try {
    const data = await api(id ? `/auth/users/${id}` : '/auth/users', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(body),
    });
    document.getElementById('adminModal').style.display = 'none';
    if (data?.temporaryPassword) {
      toast(`Admin saved. Temporary password: ${data.temporaryPassword}`);
    } else {
      toast(data?.message || 'Admin saved.');
    }
    loadAdmins();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function deactivateAdmin(id) {
  const user = (window.superAdminUsers || []).find(item => String(item.id) === String(id));
  if (!user) return;
  if (!confirm(`Deactivate ${user.name}? They will not be able to log in.`)) return;

  try {
    const data = await api(`/auth/users/${id}`, { method: 'DELETE' });
    toast(data?.message || 'Admin deactivated.');
    loadAdmins();
  } catch (err) {
    toast(err.message, 'error');
  }
}

window.deactivateAdmin = deactivateAdmin;

async function loadAdmins() {
  try {
    const data = await api('/auth/users');
    if (!data) return;
    renderAdmins(data.users || []);
  } catch (err) {
    const tbody = document.querySelector('#section-admins tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="5">${err.message}</td></tr>`;
  }
}

const ROLE_PERMISSION_KEYS = [
  'view_transactions',
  'edit_picker_profiles',
  'access_income_board',
  'export_data',
];

function permissionControls() {
  const section = document.getElementById('section-permissions');
  return Array.from(section?.querySelectorAll('input[type="checkbox"]') || []);
}

function readPermissionControls() {
  const permissions = {};
  permissionControls().forEach((control, index) => {
    const key = control.name || control.id || ROLE_PERMISSION_KEYS[index];
    if (key) permissions[key] = control.checked;
  });
  return permissions;
}

function applyPermissionControls(permissions) {
  const byKey = new Map((permissions || []).map(item => [item.permission_key, Boolean(item.allowed)]));
  permissionControls().forEach((control, index) => {
    const key = control.name || control.id || ROLE_PERMISSION_KEYS[index];
    if (key && byKey.has(key)) control.checked = byKey.get(key);
  });
}

async function loadRolePermissions() {
  const section = document.getElementById('section-permissions');
  if (!section) return;

  try {
    const data = await api('/auth/role-permissions');
    if (!data) return;
    applyPermissionControls(data.permissions || []);
  } catch (err) {
    toast(`Create the role_permissions table first: ${err.message}`, 'error');
  }
}

async function saveRolePermissions() {
  try {
    const data = await api('/auth/role-permissions', {
      method: 'PUT',
      body: JSON.stringify({ permissions: readPermissionControls() }),
    });
    toast(data?.message || 'Permissions saved to database.');
  } catch (err) {
    toast(err.message, 'error');
  }
}

function wireRolePermissions() {
  permissionControls().forEach(control => {
    control.addEventListener('change', saveRolePermissions);
  });
}

function saveLocalSection(sectionId) {
  const section = document.getElementById(`section-${sectionId}`);
  if (!section) return;

  const values = {};
  section.querySelectorAll('input, select').forEach((control, index) => {
    const key = control.name || control.id || `${control.tagName}-${index}`;
    values[key] = control.type === 'checkbox' ? control.checked : control.value;
  });
  localStorage.setItem(`ecocycle-superadmin-${sectionId}`, JSON.stringify(values));
  toast('Preference saved on this browser.');
}

function restoreLocalSection(sectionId) {
  const section = document.getElementById(`section-${sectionId}`);
  if (!section) return;
  let values = {};
  try {
    values = JSON.parse(localStorage.getItem(`ecocycle-superadmin-${sectionId}`) || '{}');
  } catch {
    values = {};
  }
  section.querySelectorAll('input, select').forEach((control, index) => {
    const key = control.name || control.id || `${control.tagName}-${index}`;
    if (!(key in values)) return;
    if (control.type === 'checkbox') control.checked = Boolean(values[key]);
    else control.value = values[key];
  });
}

function wireLocalSections() {
  ['notifications', 'language'].forEach(sectionId => {
    restoreLocalSection(sectionId);
    const section = document.getElementById(`section-${sectionId}`);
    section?.querySelectorAll('input, select').forEach(control => {
      control.addEventListener('change', () => saveLocalSection(sectionId));
    });
  });
}

function applySuperAdminAppearance() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem('ecocycle-superadmin-appearance') || '{}');
  } catch {
    saved = {};
  }

  const appearance = document.getElementById('section-appearance');
  const selects = Array.from(appearance?.querySelectorAll('select') || []);
  const themeValue = saved['SELECT-0'] || saved['select-0'] || selects[0]?.value || '';
  const dark = normalizeText(themeValue).includes('dark');
  const root = document.documentElement;
  let style = document.getElementById('superadmin-appearance-style');

  if (!style) {
    style = document.createElement('style');
    style.id = 'superadmin-appearance-style';
    document.head.appendChild(style);
  }

  if (!dark) {
    root.style.setProperty('--bg', '#f5ede0');
    root.style.setProperty('--sidebar-bg', '#ffffff');
    root.style.setProperty('--card', '#ffffff');
    root.style.setProperty('--card-bg', '#ffffff');
    root.style.setProperty('--text-dark', '#101010');
    root.style.setProperty('--text-mid', '#4a4a44');
    root.style.setProperty('--text-soft', '#7a7a70');
    root.style.setProperty('--border', '#e2dfd8');
    document.body.style.background = '';
    document.body.classList.remove('superadmin-dark-mode');
    style.textContent = '';
    return;
  }

  root.style.setProperty('--bg', '#121912');
  root.style.setProperty('--sidebar-bg', '#1d281e');
  root.style.setProperty('--card', '#1d281e');
  root.style.setProperty('--card-bg', '#1d281e');
  root.style.setProperty('--text-dark', '#f4f7f2');
  root.style.setProperty('--text-mid', '#d9e1d3');
  root.style.setProperty('--text-soft', '#aeb9a8');
  root.style.setProperty('--border', '#344436');
  document.body.style.background = '#121912';
  document.body.classList.add('superadmin-dark-mode');

  style.textContent = `
    body.superadmin-dark-mode,
    body.superadmin-dark-mode main,
    body.superadmin-dark-mode .settings-main,
    body.superadmin-dark-mode .settings-content,
    body.superadmin-dark-mode .content-panel {
      background: #121912 !important;
      color: #f4f7f2 !important;
    }
    body.superadmin-dark-mode .topbar,
    body.superadmin-dark-mode .sidebar,
    body.superadmin-dark-mode .settings-sidebar,
    body.superadmin-dark-mode .settings-nav,
    body.superadmin-dark-mode .settings-card,
    body.superadmin-dark-mode .settings-row,
    body.superadmin-dark-mode .settings-select,
    body.superadmin-dark-mode .settings-input,
    body.superadmin-dark-mode input,
    body.superadmin-dark-mode select,
    body.superadmin-dark-mode textarea {
      background: #1d281e !important;
      color: #f4f7f2 !important;
      border-color: #344436 !important;
    }
    body.superadmin-dark-mode h1,
    body.superadmin-dark-mode h2,
    body.superadmin-dark-mode h3,
    body.superadmin-dark-mode .ecocycle-wordmark,
    body.superadmin-dark-mode .settings-card-title,
    body.superadmin-dark-mode .settings-row-label,
    body.superadmin-dark-mode .settings-nav-title,
    body.superadmin-dark-mode .settings-nav-item,
    body.superadmin-dark-mode .topbar-logout {
      color: #f4f7f2 !important;
    }
    body.superadmin-dark-mode p,
    body.superadmin-dark-mode .ecocycle-sub,
    body.superadmin-dark-mode .settings-card-desc,
    body.superadmin-dark-mode .settings-row-hint,
    body.superadmin-dark-mode .settings-nav-sub,
    body.superadmin-dark-mode .settings-section-lbl {
      color: #aeb9a8 !important;
    }
    body.superadmin-dark-mode .settings-nav-item.active,
    body.superadmin-dark-mode .settings-nav-item:hover {
      background: #e4f4e7 !important;
      color: #2f9e44 !important;
    }
    body.superadmin-dark-mode .settings-nav-item.locked,
    body.superadmin-dark-mode .settings-nav-item.locked:hover {
      color: #7f8c7a !important;
      background: transparent !important;
    }
    body.superadmin-dark-mode .lock-lbl {
      background: #344436 !important;
      color: #d9e1d3 !important;
    }
  `;
}

function wireSuperAdminAppearance() {
  restoreLocalSection('appearance');
  const appearance = document.getElementById('section-appearance');
  appearance?.querySelectorAll('input, select').forEach(control => {
    control.addEventListener('change', () => {
      saveLocalSection('appearance');
      applySuperAdminAppearance();
    });
  });
  applySuperAdminAppearance();
}

function formatAuditDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function auditDetailsText(details) {
  if (!details || typeof details !== 'object') return '';
  return Object.entries(details)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
    .join(' | ');
}

function ensureAuditTable() {
  const section = document.getElementById('section-audit');
  if (!section) return null;

  let tbody = section.querySelector('.audit-db-wrapper tbody');
  if (tbody) return tbody;

  const host = section.querySelector('.settings-card') || section;
  const header = host.querySelector('.settings-card-header, .card-header') ||
    Array.from(host.children).find(child => /Recent System Activity|Export CSV/i.test(child.textContent || ''));

  Array.from(host.children).forEach(child => {
    if (child === header) return;
    child.remove();
  });

  const wrapper = document.createElement('div');
  wrapper.className = 'audit-db-wrapper';
  wrapper.style.cssText = 'overflow-x:auto;margin-top:16px';
  wrapper.innerHTML = `
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr>
          <th style="text-align:left;padding:12px;border-bottom:1px solid #e5e0d8">Date</th>
          <th style="text-align:left;padding:12px;border-bottom:1px solid #e5e0d8">Area</th>
          <th style="text-align:left;padding:12px;border-bottom:1px solid #e5e0d8">Action</th>
          <th style="text-align:left;padding:12px;border-bottom:1px solid #e5e0d8">User</th>
          <th style="text-align:left;padding:12px;border-bottom:1px solid #e5e0d8">Details</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  `;
  host.appendChild(wrapper);
  return wrapper.querySelector('tbody');
}

function renderAuditLogs(logs) {
  const tbody = ensureAuditTable();
  if (!tbody) return;
  window.superAdminAuditLogs = logs || [];

  if (!logs?.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="padding:14px">No audit logs found yet.</td></tr>';
    return;
  }

  tbody.innerHTML = logs.map(log => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #eee">${formatAuditDate(log.created_at)}</td>
      <td style="padding:12px;border-bottom:1px solid #eee">${log.area || '-'}</td>
      <td style="padding:12px;border-bottom:1px solid #eee">${log.action || '-'}</td>
      <td style="padding:12px;border-bottom:1px solid #eee">${log.actor_name || log.actor_email || 'System'}</td>
      <td style="padding:12px;border-bottom:1px solid #eee">${auditDetailsText(log.details) || '-'}</td>
    </tr>
  `).join('');
}

async function loadAuditLogs() {
  const section = document.getElementById('section-audit');
  if (!section) return;

  try {
    const data = await api('/auth/audit-logs?limit=100');
    if (!data) return;
    renderAuditLogs(data.logs || []);
  } catch (err) {
    const tbody = ensureAuditTable();
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="padding:14px">${err.message}</td></tr>`;
    toast(err.message, 'error');
  }
}

function exportAuditLogs() {
  const logs = window.superAdminAuditLogs || [];
  if (!logs.length) {
    toast('No audit logs to export.', 'error');
    return;
  }

  const headers = ['Date', 'Area', 'Action', 'User', 'Email', 'Details'];
  const rows = logs.map(log => [
    formatAuditDate(log.created_at),
    log.area || '',
    log.action || '',
    log.actor_name || '',
    log.actor_email || '',
    auditDetailsText(log.details),
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `ecocycle-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  toast('Audit logs exported.');
}

function wireDangerZone() {
  document.querySelectorAll('#section-danger .btn-danger').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      toast('This destructive action is blocked in the website demo.', 'error');
    });
  });
}

function wireButtons() {
  const inputs = profileInputs();
  if (inputs.save) inputs.save.onclick = saveProfile;
  if (inputs.cancel) inputs.cancel.onclick = loadProfile;
  if (inputs.photo) inputs.photo.onclick = choosePhoto;

  const passwordButton = Array.from(document.querySelectorAll('#section-security button'))
    .find(button => /password/i.test(button.textContent));
  if (passwordButton) passwordButton.onclick = passwordModal;

  const addAdminButton = document.querySelector('#section-admins .btn-primary');
  if (addAdminButton) {
    addAdminButton.onclick = () => openAdminModal();
  }

  const exportButton = document.querySelector('#section-audit .btn-ghost');
  if (exportButton) {
    exportButton.onclick = exportAuditLogs;
  }

  document.querySelectorAll('.topbar-logout').forEach(button => {
    button.onclick = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '../AuthScreens/login.html';
    };
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (!token()) {
    window.location.href = '../AuthScreens/login.html';
    return;
  }

  if (normalizeRole(currentUser().role) !== 'superadmin') {
    window.location.href = '../AuthScreens/user-selection.html';
    return;
  }

  showSection('profile');
  wireButtons();
  wireLocalSections();
  wireSuperAdminAppearance();
  wireRolePermissions();
  wireDangerZone();
  loadProfile().catch(err => toast(err.message, 'error'));
  loadAdmins();
  loadRolePermissions();
  loadAuditLogs();
});
