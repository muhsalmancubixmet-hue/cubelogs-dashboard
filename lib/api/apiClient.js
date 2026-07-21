export function getApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    const raw = process.env.NEXT_PUBLIC_API_URL.trim().replace(/,$/, '').trim();
    if (raw.endsWith('/api') || raw.endsWith('/api/')) {
      return raw.endsWith('/') ? raw.slice(0, -1) : raw;
    }
    return raw.endsWith('/') ? `${raw}api` : `${raw}/api`;
  }
  if (typeof window !== 'undefined') {
    const hn = window.location.hostname;
    if (hn === 'localhost' || hn === '127.0.0.1' || hn.startsWith('192.168.') || hn.startsWith('10.') || hn.startsWith('172.')) {
      return `http://${hn}:8000/api`;
    }
  }
  return 'http://127.0.0.1:8000/api';
}

export function getBackendBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    const raw = process.env.NEXT_PUBLIC_API_URL.trim().replace(/,$/, '').trim();
    const clean = raw.endsWith('/api') ? raw.slice(0, -4) : (raw.endsWith('/api/') ? raw.slice(0, -5) : raw);
    return clean.endsWith('/') ? clean.slice(0, -1) : clean;
  }
  if (typeof window !== 'undefined') {
    const hn = window.location.hostname;
    if (hn === 'localhost' || hn === '127.0.0.1' || hn.startsWith('192.168.') || hn.startsWith('10.') || hn.startsWith('172.')) {
      return `http://${hn}:8000`;
    }
  }
  return 'http://127.0.0.1:8000';
}

export const API_BASE_URL = getApiBaseUrl();
export const BACKEND_BASE_URL = getBackendBaseUrl();

function getCsrfToken() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : null;
}

async function parseResponse(response) {
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
    const err = new Error(errorMessage || response.statusText || 'API Request Failed');
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function apiFetch(path, options = {}) {
  let cleanPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = getApiBaseUrl();
  if (cleanPath.startsWith('/api/')) {
    cleanPath = cleanPath.slice(4);
  }
  const url = `${baseUrl}${cleanPath}`;

  const headers = { ...(options.headers || {}) };

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
    credentials: 'include', // SessionAuthentication via HttpOnly sessionid and csrftoken
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (err) {
    console.error(`apiFetch network failure for URL: ${url}`, err);
    throw new Error(`Failed to fetch resources from: ${url}. Network error.`);
  }

  return parseResponse(response);
}

let isLoggingOut = false;
export async function apiLogout() {
  if (typeof window !== 'undefined' && !isLoggingOut) {
    isLoggingOut = true;
    try {
      const baseUrl = getApiBaseUrl();
      const csrfToken = getCsrfToken();
      await fetch(`${baseUrl}/auth/logout/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {})
        },
      });
    } catch (e) {
      // Ignore network errors during logout call
    } finally {
      isLoggingOut = false;
    }
  }
}
