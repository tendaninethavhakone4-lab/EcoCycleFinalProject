lucide.createIcons();

function getUser() {
  return JSON.parse(localStorage.getItem('user') || '{}');
}

function normalizeRole(role) {
  return String(role || '')
    .toLowerCase()
    .replace(/[\s_-]/g, '');
}

const roleRoutes = {
  employee: '../UserScreens/EmployeeDashboard.html',
  user: '../UserScreens/EmployeeDashboard.html',
  admin: '../AdminScreens/admin-dashboard.html',
  superadmin: '../SuperAdminScreens/SuperAdminDashboard.html',
};

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  const user = getUser();
  const userRole = normalizeRole(user.role);

  document.querySelectorAll('.role-card').forEach(card => {
    card.classList.remove('selected');
  });

  if (!roleRoutes[userRole]) {
    console.warn('Unknown user role:', user.role);
  }
});

function selectRole(element) {
  const user = getUser();
  const userRole = normalizeRole(user.role);
  const title = element.querySelector('.role-title')?.textContent || '';
  const selectedRole = normalizeRole(title);

  const allowed = userRole === 'superadmin' ||
    userRole === selectedRole ||
    (userRole === 'user' && selectedRole === 'employee');

  if (!allowed) {
    alert(`You are logged in as ${user.role || 'unknown'}, so you cannot open ${title}.`);
    window.location.href = roleRoutes[userRole] || '../UserScreens/EmployeeDashboard.html';
    return;
  }

  const targetURL = roleRoutes[selectedRole] || element.getAttribute('data-url');
  if (targetURL) {
    window.location.href = targetURL;
  }
}
