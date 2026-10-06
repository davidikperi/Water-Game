document.getElementById('login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const button = document.getElementById('submit');
  button.disabled = true;
  document.getElementById('error').textContent = '';
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: document.getElementById('code').value,
        password: document.getElementById('password').value,
      }),
    });
    if (response.ok) {
      location.href = '/admin';
      return;
    }
    document.getElementById('error').textContent =
      response.status === 429
        ? 'Too many attempts. Try again in 15 minutes.'
        : 'Incorrect login code or password.';
  } catch (_) {
    document.getElementById('error').textContent = 'Could not connect. Please try again.';
  }
  button.disabled = false;
});
