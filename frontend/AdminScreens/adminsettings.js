const ADMIN_SETTINGS_API_URL = (() => {
  const h = window.location.hostname;
  return (!h || h === 'localhost' || h === '127.0.0.1') ? 'http://localhost:4000/api' : '/api';
})();

function adminSettingsToken() {
  return localStorage.getItem('token');
}

function adminSettingsUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
}

function saveAdminSettingsUser(user) {
  localStorage.setItem('user', JSON.stringify(user || {}));
}

async function adminSettingsFetch(path, options = {}) {
  const headers = {
    Authorization: `Bearer ${adminSettingsToken()}`,
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  const response = await fetch(`${ADMIN_SETTINGS_API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../AuthScreens/login.html';
    return null;
  }

  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

function adminToast(message) {
  let toast = document.getElementById('adminSettingsToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'adminSettingsToast';
    toast.style.cssText = 'position:fixed;right:24px;bottom:24px;z-index:9999;background:#1f2937;color:white;padding:14px 18px;border-radius:12px;font-family:DM Sans,sans-serif;font-weight:700;box-shadow:0 12px 32px rgba(0,0,0,.22);max-width:360px';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.display = 'block';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function adminInitials(name) {
  return String(name || 'Admin')
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function normalizeRole(role) {
  return String(role || '').toLowerCase().replace(/[\s_-]/g, '');
}

function findProfileInputs() {
  const section = document.getElementById('section-profile');
  const inputs = Array.from(section?.querySelectorAll('.settings-input') || []);
  return {
    name: inputs.find(input => input.type === 'text' && !input.readOnly),
    phone: inputs.find(input => input.type === 'tel'),
    email: inputs.find(input => input.type === 'email'),
  };
}

function fillAdminProfile(user) {
  const profileName = document.querySelector('.profile-name');
  const profileRole = document.querySelector('.profile-role');
  const avatar = document.querySelector('.profile-avatar');
  const navSub = document.querySelector('.settings-nav-sub');
  const roleBadge = document.querySelector('.badge-admin');
  const regionBadge = document.querySelector('.region-badge');
  const inputs = findProfileInputs();

  const name = user.name || 'Admin';
  const role = user.role || 'admin';
  const branch = user.branch || 'Admin';

  if (profileName) profileName.textContent = name;
  if (profileRole) profileRole.textContent = `${role === 'superadmin' ? 'Super Administrator' : 'Regional Administrator'} - ${branch}`;
  if (navSub) navSub.textContent = `${branch} - ${role}`;
  if (roleBadge) roleBadge.textContent = role === 'superadmin' ? 'Super Admin' : 'Admin';
  if (regionBadge) {
    const textNode = Array.from(regionBadge.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.textContent = ` ${branch}`;
  }

  if (inputs.name) inputs.name.value = name;
  if (inputs.phone) inputs.phone.value = user.phone || '';
  if (inputs.email) inputs.email.value = user.email || '';

  const photoUrl = user.photo_url || user.photo || '';
  if (avatar) {
    if (photoUrl) {
      avatar.innerHTML = `<img src="${photoUrl}" alt="Profile photo" style="width:100%;height:100%;border-radius:inherit;object-fit:cover">`;
    } else {
      avatar.textContent = adminInitials(name);
    }
  }
}

function showSection(id) {
  document.querySelectorAll('[id^="section-"]').forEach(section => {
    section.style.display = 'none';
  });

  const section = document.getElementById(`section-${id}`);
  if (section) section.style.display = 'block';

  document.querySelectorAll('.settings-nav-item:not(.locked)').forEach(item => {
    item.classList.remove('active');
    const action = item.getAttribute('onclick') || '';
    if (action.includes(`'${id}'`) || action.includes(`"${id}"`)) item.classList.add('active');
  });

  if (id === 'pickers') loadAdminPickers();
}

async function loadAdminProfile() {
  const localUser = adminSettingsUser();
  fillAdminProfile(localUser);

  try {
    const data = await adminSettingsFetch('/auth/me');
    if (data?.user) {
      const user = { ...localUser, ...data.user };
      saveAdminSettingsUser(user);
      fillAdminProfile(user);
    }
  } catch (err) {
    adminToast(`Could not load profile: ${err.message}`);
  }
}

async function saveAdminProfile() {
  const inputs = findProfileInputs();
  const name = inputs.name?.value.trim();
  const email = inputs.email?.value.trim();
  const phone = inputs.phone?.value.trim();

  if (!name || !email) {
    adminToast('Name and email are required.');
    return;
  }

  try {
    const data = await adminSettingsFetch('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, email, phone }),
    });
    const user = { ...adminSettingsUser(), ...(data.user || {}), name, email, phone };
    saveAdminSettingsUser(user);
    fillAdminProfile(user);
    adminToast('Profile saved to the database.');
  } catch (err) {
    adminToast(`Could not save profile: ${err.message}`);
  }
}

function attachProfileButtons() {
  const section = document.getElementById('section-profile');
  const buttons = Array.from(section?.querySelectorAll('button') || []);
  const saveButton = buttons.find(button => button.textContent.trim().toLowerCase().includes('save'));
  const cancelButton = buttons.find(button => button.textContent.trim().toLowerCase().includes('cancel'));
  const photoButton = section?.querySelector('.change-photo-btn');

  if (saveButton) {
    saveButton.onclick = event => {
      event.preventDefault();
      saveAdminProfile();
    };
  }
  if (cancelButton) {
    cancelButton.onclick = event => {
      event.preventDefault();
      fillAdminProfile(adminSettingsUser());
    };
  }
  if (photoButton) {
    photoButton.onclick = event => {
      event.preventDefault();
      openAdminPhotoUpload();
    };
  }
}

function openAdminPhotoUpload() {
  let input = document.getElementById('adminProfilePhotoInput');
  if (!input) {
    input = document.createElement('input');
    input.id = 'adminProfilePhotoInput';
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.addEventListener('change', () => uploadAdminPhoto(input));
    document.body.appendChild(input);
  }
  input.click();
}

async function uploadAdminPhoto(input) {
  const file = input.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    adminToast('Please choose an image file.');
    input.value = '';
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    adminToast('Please choose an image smaller than 2 MB.');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = async event => {
    try {
      const data = await adminSettingsFetch('/auth/profile/photo', {
        method: 'POST',
        body: JSON.stringify({
          image: event.target.result,
          fileName: file.name,
        }),
      });
      const user = { ...adminSettingsUser(), ...(data.user || {}), photo_url: data.photo_url };
      saveAdminSettingsUser(user);
      fillAdminProfile(user);
      adminToast('Profile photo saved to Supabase.');
    } catch (err) {
      adminToast(`Could not upload photo: ${err.message}`);
    } finally {
      input.value = '';
    }
  };
  reader.readAsDataURL(file);
}

function attachSecurity() {
  const security = document.getElementById('section-security');
  const changeButton = Array.from(security?.querySelectorAll('button') || [])
    .find(button => button.textContent.trim().toLowerCase().includes('update password'));

  if (!security) return;

  security.querySelectorAll('input[type="checkbox"]').forEach(control => {
    control.addEventListener('change', () => saveLocalAdminSection('security'));
  });

  const sessionsButton = Array.from(security.querySelectorAll('button'))
    .find(button => button.textContent.trim().toLowerCase().includes('view sessions'));
  if (sessionsButton) {
    sessionsButton.onclick = event => {
      event.preventDefault();
      showAdminSessions();
    };
  }

  if (!changeButton) return;

  changeButton.onclick = event => {
    event.preventDefault();
    showPasswordPanel(security);
  };
}

function showPasswordPanel(security) {
  let panel = document.getElementById('adminPasswordPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'adminPasswordPanel';
    panel.className = 'settings-row';
    panel.innerHTML = `
      <div class="settings-row-left">
        <div class="settings-row-label">Update Password</div>
        <div class="settings-row-hint">Enter your current password and choose a new one.</div>
      </div>
      <div class="settings-row-right" style="display:grid;gap:8px;min-width:280px">
        <input class="settings-input" id="adminCurrentPassword" type="password" placeholder="Current password">
        <input class="settings-input" id="adminNewPassword" type="password" placeholder="New password">
        <input class="settings-input" id="adminConfirmPassword" type="password" placeholder="Confirm new password">
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-ghost" id="cancelAdminPassword" type="button">Cancel</button>
          <button class="btn btn-primary" id="saveAdminPassword" type="button">Save Password</button>
        </div>
      </div>
    `;
    security.querySelector('.settings-card')?.appendChild(panel);

    panel.querySelector('#cancelAdminPassword').onclick = () => {
      panel.style.display = 'none';
    };
    panel.querySelector('#saveAdminPassword').onclick = saveAdminPassword;
  }

  panel.style.display = '';
  panel.querySelector('#adminCurrentPassword')?.focus();
}

async function saveAdminPassword() {
  const currentPassword = document.getElementById('adminCurrentPassword')?.value || '';
  const newPassword = document.getElementById('adminNewPassword')?.value || '';
  const confirmPassword = document.getElementById('adminConfirmPassword')?.value || '';
  const button = document.getElementById('saveAdminPassword');

  if (!currentPassword || !newPassword || !confirmPassword) {
    adminToast('Please fill in all password fields.');
    return;
  }

  if (newPassword.length < 8) {
    adminToast('New password must be at least 8 characters.');
    return;
  }

  if (newPassword !== confirmPassword) {
    adminToast('New password and confirmation do not match.');
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = 'Saving...';
  }

  try {
    await adminSettingsFetch('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    ['adminCurrentPassword', 'adminNewPassword', 'adminConfirmPassword'].forEach(id => {
      const input = document.getElementById(id);
      if (input) input.value = '';
    });
    const panel = document.getElementById('adminPasswordPanel');
    if (panel) panel.style.display = 'none';
    adminToast('Password updated in the database.');
  } catch (err) {
    adminToast(`Could not change password: ${err.message}`);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Save Password';
    }
  }
}

function showAdminSessions() {
  const user = adminSettingsUser();
  let panel = document.getElementById('adminSessionsPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'adminSessionsPanel';
    panel.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:9998;display:flex;align-items:center;justify-content:center';
    panel.innerHTML = `
      <div style="background:white;border-radius:16px;padding:24px;max-width:420px;width:92%;font-family:DM Sans,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.25)">
        <h3 style="font-family:Sora,sans-serif;margin-bottom:8px">Active Sessions</h3>
        <p style="color:#6b7280;margin-bottom:16px">This project does not store a full session table yet. The current browser login is shown below.</p>
        <div style="padding:12px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:16px">
          <strong>${user.email || 'Current admin'}</strong>
          <div style="font-size:13px;color:#6b7280;margin-top:4px">Current browser session</div>
        </div>
        <button class="btn btn-primary" id="closeAdminSessions" type="button" style="width:100%">Close</button>
      </div>
    `;
    document.body.appendChild(panel);
    panel.querySelector('#closeAdminSessions').onclick = () => {
      panel.style.display = 'none';
    };
    panel.addEventListener('click', event => {
      if (event.target === panel) panel.style.display = 'none';
    });
  }
  panel.style.display = 'flex';
}

function wireAdminNav() {
  document.querySelectorAll('.settings-nav-item:not(.locked)').forEach(item => {
    const action = item.getAttribute('onclick') || '';
    const match = action.match(/showSection\(['"]([^'"]+)['"]\)/);
    if (!match) return;

    const sectionId = match[1];
    item.onclick = event => {
      event.preventDefault();
      showSection(sectionId);
    };
  });

  document.querySelectorAll('.settings-nav-item.locked').forEach(item => {
    item.onclick = event => {
      event.preventDefault();
      adminToast('This section is restricted to Super Admin accounts.');
    };
  });
}

async function loadAdminPickers() {
  const pickerSection = document.getElementById('section-pickers');
  if (!pickerSection) return;

  try {
    const data = await adminSettingsFetch('/admin/pickers');
    const allPickers = data?.pickers || [];
    const user = adminSettingsUser();
    const branch = String(user.branch || '').toLowerCase();
    const role = normalizeRole(user.role);
    const pickers = role === 'superadmin'
      ? allPickers
      : allPickers.filter(picker => String(picker.branch || picker.zone || '').toLowerCase() === branch);

    const active = pickers.filter(picker => String(picker.status || 'active').toLowerCase() === 'active').length;
    const title = pickerSection.querySelector('.content-header p');
    const desc = pickerSection.querySelector('.settings-card-desc');
    const list = pickerSection.querySelector('.picker-list');

    if (title) title.textContent = `Manage ${pickers.length} registered pickers${role === 'superadmin' ? '' : ` in ${user.branch || 'your region'}`}`;
    if (desc) desc.textContent = `${pickers.length} total - ${active} active`;

    if (list) {
      list.innerHTML = pickers.slice(0, 8).map(picker => `
        <div class="picker-row">
          <div class="picker-av">${adminInitials(picker.name)}</div>
          <div class="picker-info">
            <div class="picker-name-t">${picker.name || 'Unnamed picker'}</div>
            <div class="picker-id-t">#${picker.id || 'N/A'} - ${picker.branch || picker.zone || 'Unassigned'}</div>
          </div>
          <span class="picker-status ${picker.status === 'inactive' ? 'inactive' : 'active'}">${picker.status === 'inactive' ? 'Inactive' : 'Active'}</span>
        </div>
      `).join('') || '<div class="picker-row"><div class="picker-info"><div class="picker-name-t">No pickers found</div><div class="picker-id-t">Registered pickers will appear here.</div></div></div>';
    }

    const registerButton = pickerSection.querySelector('.btn-primary');
    if (registerButton) {
      registerButton.onclick = event => {
        event.preventDefault();
        window.location.href = '../UserScreens/RegisterUsers.html';
      };
    }
  } catch (err) {
    adminToast(`Could not load pickers: ${err.message}`);
  }
}

function saveLocalAdminSection(sectionId) {
  const section = document.getElementById(`section-${sectionId}`);
  if (!section) return;

  const values = {};
  section.querySelectorAll('input, select').forEach((field, index) => {
    values[field.name || field.id || `${field.tagName}-${index}`] = field.type === 'checkbox' ? field.checked : field.value;
  });
  localStorage.setItem(`ecocycle-admin-${sectionId}`, JSON.stringify(values));
  adminToast('Preference saved on this browser.');
}

function restoreLocalAdminSections() {
  ['notifications', 'region', 'appearance', 'language', 'privacy'].forEach(sectionId => {
    const section = document.getElementById(`section-${sectionId}`);
    if (!section) return;
    let values = {};
    try {
      values = JSON.parse(localStorage.getItem(`ecocycle-admin-${sectionId}`) || '{}');
    } catch {
      values = {};
    }
    section.querySelectorAll('input, select').forEach((field, index) => {
      const key = field.name || field.id || `${field.tagName}-${index}`;
      if (!(key in values)) return;
      if (field.type === 'checkbox') field.checked = values[key];
      else field.value = values[key];
    });
  });
}

function attachLocalPreferenceButtons() {
  ['notifications', 'region', 'appearance', 'language', 'privacy'].forEach(sectionId => {
    const section = document.getElementById(`section-${sectionId}`);
    const buttons = Array.from(section?.querySelectorAll('button') || []);
    buttons.forEach(button => {
      if (button.textContent.toLowerCase().includes('save')) {
        button.onclick = event => {
          event.preventDefault();
          saveLocalAdminSection(sectionId);
        };
      }
    });
  });
}

function applyAdminAppearance() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem('ecocycle-admin-appearance') || '{}');
  } catch {
    saved = {};
  }

  const appearance = document.getElementById('section-appearance');
  const selects = Array.from(appearance?.querySelectorAll('select') || []);
  const theme = saved['SELECT-0'] || saved['select-0'] || selects[0]?.value || 'Ecocycle Green';
  const dark = normalizeText(theme).includes('dark');
  const root = document.documentElement;
  let style = document.getElementById('admin-appearance-fix-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'admin-appearance-fix-style';
    document.head.appendChild(style);
  }

  if (dark) {
    root.style.setProperty('--bg', '#151a16');
    root.style.setProperty('--sidebar-bg', '#202720');
    root.style.setProperty('--card', '#202720');
    root.style.setProperty('--card-bg', '#202720');
    root.style.setProperty('--text-dark', '#f3f5f0');
    root.style.setProperty('--text-mid', '#d4dacd');
    root.style.setProperty('--text-soft', '#aeb8aa');
    root.style.setProperty('--border', '#344036');
    document.body.style.background = '#151a16';
    style.textContent = `
      .topbar {
        background: #202720 !important;
        border-color: #344036 !important;
      }
      .ecocycle-wordmark,
      .topbar-logout {
        color: #f3f5f0 !important;
      }
      .ecocycle-sub {
        color: #aeb8aa !important;
      }
      main.settings-main,
      .settings-inner,
      .settings-content,
      .content-panel {
        background: #151a16 !important;
        color: #f3f5f0 !important;
      }
      .settings-nav,
      .settings-card,
      .settings-row,
      .settings-select,
      .settings-input {
        background: #202720 !important;
        color: #f3f5f0 !important;
        border-color: #344036 !important;
      }
      .settings-card-title,
      .settings-row-label,
      .content-header h2,
      .settings-nav-title,
      .settings-nav-item {
        color: #f3f5f0 !important;
      }
      .settings-card-desc,
      .settings-row-hint,
      .content-header p,
      .settings-section-lbl,
      .settings-nav-sub {
        color: #aeb8aa !important;
      }
      .settings-nav-item.active,
      .settings-nav-item:hover {
        background: var(--primary-pale) !important;
        color: var(--primary) !important;
      }
      .settings-nav-item.locked {
        opacity: 0.7 !important;
      }
      .settings-nav-item.locked,
      .settings-nav-item.locked:hover {
        color: #7f8c7a !important;
        background: transparent !important;
      }
      .lock-lbl {
        background: #344036 !important;
        color: #d4dacd !important;
      }
    `;
  } else {
    root.style.setProperty('--bg', '#f5ede0');
    root.style.setProperty('--sidebar-bg', '#ffffff');
    root.style.setProperty('--card', '#ffffff');
    root.style.setProperty('--card-bg', '#ffffff');
    root.style.setProperty('--text-dark', '#101010');
    root.style.setProperty('--text-mid', '#4a4a44');
    root.style.setProperty('--text-soft', '#7a7a70');
    root.style.setProperty('--border', '#e2dfd8');
    document.body.style.background = '';
    style.textContent = '';
  }
}

function attachAppearanceControls() {
  const appearance = document.getElementById('section-appearance');
  if (!appearance) return;

  appearance.querySelectorAll('input, select').forEach(control => {
    control.addEventListener('change', () => {
      saveLocalAdminSection('appearance');
      applyAdminAppearance();
    });
  });

  applyAdminAppearance();
}

function attachNotificationControls() {
  const notifications = document.getElementById('section-notifications');
  if (!notifications) return;

  notifications.querySelectorAll('input[type="checkbox"]').forEach(control => {
    control.addEventListener('change', () => saveLocalAdminSection('notifications'));
  });

  const badge = document.querySelector('.notif-badge');
  if (badge) {
    badge.onclick = event => {
      event.preventDefault();
      badge.style.display = 'none';
      adminToast('Notifications marked as read on this browser.');
    };
  }
}

function attachLanguageControls() {
  const language = document.getElementById('section-language');
  if (!language) return;

  language.querySelectorAll('select').forEach(control => {
    control.addEventListener('change', () => saveLocalAdminSection('language'));
  });
}

function attachRegionControls() {
  const region = document.getElementById('section-region');
  if (!region) return;

  region.querySelectorAll('input:not([readonly]), select').forEach(control => {
    control.addEventListener('change', () => saveLocalAdminSection('region'));
  });
}

function attachPrivacyControls() {
  const privacy = document.getElementById('section-privacy');
  if (!privacy) return;

  privacy.querySelectorAll('input[type="checkbox"]').forEach(control => {
    control.addEventListener('change', () => saveLocalAdminSection('privacy'));
  });

  const buttons = Array.from(privacy.querySelectorAll('button'));
  const exportButton = buttons.find(button => normalizeText(button.textContent).includes('request export'));
  const manageButton = buttons.find(button => normalizeText(button.textContent).includes('manage'));

  if (exportButton) {
    exportButton.onclick = event => {
      event.preventDefault();
      const user = adminSettingsUser();
      const blob = new Blob([JSON.stringify(user, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ecocycle-admin-profile.json';
      link.click();
      URL.revokeObjectURL(url);
      adminToast('Your admin profile export was created.');
    };
  }

  if (manageButton) {
    manageButton.onclick = event => {
      event.preventDefault();
      adminToast('Connected apps are not stored in the database yet.');
    };
  }
}

function adminSettingsGuard() {
  const role = normalizeRole(adminSettingsUser().role);
  if (role && role !== 'admin' && role !== 'superadmin') {
    alert('You are logged in as employee, so you cannot open Admin.');
    window.location.href = '../AuthScreens/user-selection.html';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  adminSettingsGuard();
  window.showSection = showSection;
  restoreLocalAdminSections();
  wireAdminNav();
  attachProfileButtons();
  attachSecurity();
  attachLocalPreferenceButtons();
  attachAppearanceControls();
  attachNotificationControls();
  attachLanguageControls();
  attachRegionControls();
  attachPrivacyControls();
  loadAdminProfile();
  loadAdminPickers();
});
