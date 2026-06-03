const API_URL = 'http://localhost:4000/api';

async function handleSignup() {
  const name = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn = document.querySelector('.btn-primary');

  if (!name || !email || !password) {
    alert('Please fill in all fields.');
    return;
  }

  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    alert('Password must be at least 8 characters and include both letters and numbers.');
    return;
  }

  btn.textContent = 'Creating account...';
  btn.disabled = true;

  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || 'Could not create account. Please try again.');
      return;
    }

    alert(data.message || 'Account created successfully!');
    window.location.href = 'login.html';
  } catch (err) {
    alert('Could not connect to the server. Make sure the backend is running.');
  } finally {
    btn.textContent = 'Create Account';
    btn.disabled = false;
  }
}
