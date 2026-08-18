import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './tokenStorage';

export { getAccessToken, getRefreshToken, setTokens, clearTokens };

export function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (e) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function getApiBaseUrl() {
  if (typeof window !== 'undefined') {
    const hn = window.location.hostname;
    if (hn === 'localhost' || hn === '127.0.0.1' || hn.startsWith('192.168.') || hn.startsWith('10.') || hn.startsWith('172.')) {
      return `http://${hn}:8000/api`;
    }
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    const raw = process.env.NEXT_PUBLIC_API_URL.trim().replace(/,$/, '').trim();
    if (raw.endsWith('/api') || raw.endsWith('/api/')) {
      return raw.endsWith('/') ? raw.slice(0, -1) : raw;
    }
    return raw.endsWith('/') ? `${raw}api` : `${raw}/api`;
  }
  return 'http://127.0.0.1:8000/api';
}

export function getBackendBaseUrl() {
  if (typeof window !== 'undefined') {
    const hn = window.location.hostname;
    if (hn === 'localhost' || hn === '127.0.0.1' || hn.startsWith('192.168.') || hn.startsWith('10.') || hn.startsWith('172.')) {
      return `http://${hn}:8000`;
    }
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    const raw = process.env.NEXT_PUBLIC_API_URL.trim().replace(/,$/, '').trim();
    const clean = raw.endsWith('/api') ? raw.slice(0, -4) : (raw.endsWith('/api/') ? raw.slice(0, -5) : raw);
    return clean.endsWith('/') ? clean.slice(0, -1) : clean;
  }
  return 'http://127.0.0.1:8000';
}

export const API_BASE_URL = getApiBaseUrl();
export const BACKEND_BASE_URL = getBackendBaseUrl();

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

let refreshPromise = null;

export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearTokens();
        throw new Error('No refresh token available');
      }

      const baseUrl = getApiBaseUrl();
      const url = `${baseUrl}/auth/refresh/`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!response.ok) {
        clearTokens();
        const errData = await response.json().catch(() => ({}));
        const err = new Error(errData.detail || errData.error || 'Token refresh failed');
        err.status = response.status;
        throw err;
      }

      const data = await response.json();
      if (data && data.access) {
        setTokens(data.access, data.refresh || refreshToken);
        return data.access;
      } else {
        clearTokens();
        throw new Error('Invalid token refresh response');
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
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

  if (!headers.Authorization) {
    const accessToken = getAccessToken();
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  const config = {
    ...options,
    headers,
  };

  let response;

  try {
    response = await fetch(url, config);
  } catch (err) {
    console.error(`apiFetch network failure for URL: ${url}`, err);
    throw new Error(`Failed to fetch resources from: ${url}. Network error.`);
  }

  const isAuthEndpoint =
    cleanPath.startsWith('/auth/login') ||
    cleanPath.startsWith('/auth/refresh') ||
    cleanPath.startsWith('/auth/magic-login') ||
    cleanPath.startsWith('/auth/password-reset');

  if (
    response.status === 401 &&
    !options._retry &&
    !isAuthEndpoint &&
    getRefreshToken()
  ) {
    try {
      const newAccessToken = await refreshAccessToken();

      const retryHeaders = {
        ...(options.headers || {}),
        Authorization: `Bearer ${newAccessToken}`,
      };

      if (
        options.body &&
        !(options.body instanceof FormData) &&
        !retryHeaders['Content-Type']
      ) {
        retryHeaders['Content-Type'] = 'application/json';
      }

      const retryResponse = await fetch(url, {
        ...options,
        _retry: true,
        headers: retryHeaders,
      });

      return parseResponse(retryResponse);
    } catch (refreshErr) {
      return parseResponse(response);
    }
  }

  return parseResponse(response);
}

let isLoggingOut = false;
export async function apiLogout() {
  if (typeof window !== 'undefined' && !isLoggingOut) {
    isLoggingOut = true;
    try {
      const baseUrl = getApiBaseUrl();
      const refreshToken = getRefreshToken();
      const accessToken = getAccessToken();

      const headers = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      await fetch(`${baseUrl}/auth/logout/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ refresh: refreshToken }),
      });
    } catch (e) {
      // Ignore network errors during logout call
    } finally {
      clearTokens();
      isLoggingOut = false;
    }
  }
}
