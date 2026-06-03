const API_URL = (() => {
  const h = window.location.hostname;
  return (!h || h === 'localhost' || h === '127.0.0.1') ? 'http://localhost:4000/api' : 'https://ecocycleprojectfinal-1.onrender.com/api';
})();

// ─── HANDLE LOGIN ─────────────────────────────────────────────────────────

async function handleLogin() {
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn      = document.querySelector('.btn-primary');

  // ── Validation ──────────────────────────────────────────────────
  
  if (!email || !password) {
    showError('Please fill in all fields.');
    return;
  }

  // ── Show loading state ────────────────────────────────────────────────
  
  btn.textContent = 'Signing in...';
  btn.disabled    = true;
  clearError();

  try {

    // ── Call the backend API ──────────────────────────────────────────
    
    const response = await fetch(`${API_URL}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });

    const data = await response.json();

    // ── If login failed, show the error message from the server ───────
    
    if (!response.ok) {
      showError(data.error || 'Login failed. Please try again.');
      return;
    }

    // ── Save token and user info to localStorage ──────────────────────
   
    localStorage.setItem('token', data.token);
    localStorage.setItem('user',  JSON.stringify(data.user));
    
    // ── Redirect to role selection page ──────────────────────────────────
    
    window.location.href = 'user-selection.html';

  } catch (err) {
    // ── Network error (server not running, etc.) ───────────────────────
    
    showError('Could not connect to the server. Make sure the backend is running.');
  } finally {
    
    btn.textContent = 'Sign In';
    btn.disabled    = false;
  }
}

// ─── HELPER: SHOW ERROR MESSAGE ───────────────────────────────────────────

function showError(message) {
  let errorDiv = document.getElementById('login-error');

  
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.id = 'login-error';
    errorDiv.style.cssText = `
      background: #fee2e2;
      color: #dc2626;
      border: 1px solid #fca5a5;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 12px;
      font-size: 14px;
      text-align: center;
    `;
   
    const btn = document.querySelector('.btn-primary');
    btn.parentNode.insertBefore(errorDiv, btn);
  }

  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

// ─── HELPER: CLEAR ERROR MESSAGE ──────────────────────────────────────────

function clearError() {
  const errorDiv = document.getElementById('login-error');
  if (errorDiv) errorDiv.style.display = 'none';
}

// ─── ALLOW PRESSING ENTER TO SUBMIT ──────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
});