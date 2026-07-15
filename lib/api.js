export const API_BASE_URL = (() => {
  const base = process.env.NEXT_PUBLIC_API_URL || 'https://salmankwork.pythonanywhere.com';
  return base.endsWith('/') ? `${base}api` : `${base}/api`;
})();

export const BACKEND_BASE_URL = (() => {
  const base = process.env.NEXT_PUBLIC_API_URL || 'https://salmankwork.pythonanywhere.com';
  return base.endsWith('/') ? base.slice(0, -1) : base;
})();

function getCsrfToken() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : null;
}

export async function apiFetch(path, options = {}) {
  // Ensure path starts with a slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${cleanPath}`;
  
  const headers = { ...(options.headers || {}) };
  
  // Set JSON content type if body is present and not FormData
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  
  const csrfToken = getCsrfToken();
  if (csrfToken && !headers['X-CSRFToken']) {
    headers['X-CSRFToken'] = csrfToken;
  }
  
  const config = {
    ...options,
    headers,
    credentials: 'include', // Always send cookies (HttpOnly JWT)
  };
  
  let response;
  try {
    response = await fetch(url, config);
  } catch (err) {
    console.error(`apiFetch failed for URL: ${url}`, err);
    throw new Error(`Failed to fetch resources from: ${url}. Network error.`);
  }
  
  // Handle 401 Unauthorized (JWT expired) - try silent refresh via cookie
  if (response.status === 401 && typeof window !== 'undefined' && !cleanPath.includes('/auth/login') && !cleanPath.includes('/auth/refresh') && !cleanPath.includes('/auth/logout')) {
    try {
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Sends refresh cookie, gets new access cookie
        body: JSON.stringify({}),
      });
      
      if (refreshResponse.ok) {
        // Retry original request with refreshed cookie
        try {
          response = await fetch(url, config);
        } catch (retryErr) {
          console.error(`apiFetch retry failed for URL: ${url}`, retryErr);
          throw new Error(`Failed to fetch resources from: ${url} after token refresh.`);
        }
      } else {
        logoutAndRedirect();
        throw new Error('Session expired. Please log in again.');
      }
    } catch (e) {
      if (e.message && e.message.includes('Session expired')) throw e;
      logoutAndRedirect();
      throw new Error('Session expired. Please log in again.');
    }
  }
  
  if (response.status === 204) {
    return null;
  }
  
  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = { message: await response.text() };
  }
  
  if (!response.ok) {
    let errorMessage = data.error || data.detail;
    if (!errorMessage && data && typeof data === 'object') {
      const fields = Object.values(data).filter(v => Array.isArray(v)).flat();
      if (fields.length > 0) {
        errorMessage = fields.join(', ');
      }
    }
    throw new Error(errorMessage || response.statusText || 'API Request Failed');
  }
  return data;
}

export async function logoutAndRedirect() {
  if (typeof window !== 'undefined') {
    // Call backend logout to clear HttpOnly cookies
    try {
      await fetch(`${API_BASE_URL}/auth/logout/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e) {
      // Ignore logout errors - proceed with client cleanup
    }
    // Clean up any residual localStorage (for backward compatibility)
    localStorage.removeItem('cubelogs_access_token');
    localStorage.removeItem('cubelogs_refresh_token');
    localStorage.removeItem('cubelogs_active_user');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
}
