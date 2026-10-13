let cachedCsrfToken = null;

export async function fetchCsrfToken() {
  try {
    const res = await fetch('/api/csrf-token', { credentials: 'include' });
    const data = await res.json();
    cachedCsrfToken = data.csrfToken;
    return cachedCsrfToken;
  } catch (err) {
    console.error('Failed to fetch CSRF token:', err);
    return null;
  }
}

export async function apiRequest(endpoint, options = {}) {
  if (!cachedCsrfToken && !['GET', 'HEAD'].includes(options.method || 'GET')) {
    await fetchCsrfToken();
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(cachedCsrfToken ? { 'X-CSRF-Token': cachedCsrfToken } : {}),
    ...options.headers
  };

  const response = await fetch(endpoint, {
    credentials: 'include',
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || `HTTP Error ${response.status}`);
  }

  return data;
}

export async function adminRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  const response = await fetch(endpoint, {
    credentials: 'include',
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Admin HTTP Error ${response.status}`);
  }

  return data;
}
