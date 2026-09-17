import { getAccessToken, getRefreshToken, setTokens, clearTokens, getActiveOrgId, setActiveOrgId } from './tokenStorage';

export { getAccessToken, getRefreshToken, setTokens, clearTokens, getActiveOrgId, setActiveOrgId };

export function normalizeListResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

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
      return `http://${hn}:8000/api/v1`;
    }
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    const raw = process.env.NEXT_PUBLIC_API_URL.trim().replace(/,$/, '').trim();
    if (raw.endsWith('/api/v1') || raw.endsWith('/api/v1/')) {
      return raw.endsWith('/') ? raw.slice(0, -1) : raw;
    }
    if (raw.endsWith('/api') || raw.endsWith('/api/')) {
      const base = raw.endsWith('/') ? raw.slice(0, -1) : raw;
      return `${base}/v1`;
    }
    return raw.endsWith('/') ? `${raw}api/v1` : `${raw}/api/v1`;
  }
  return 'http://127.0.0.1:8000/api/v1';
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
    let clean = raw;
    if (clean.endsWith('/api/v1')) clean = clean.slice(0, -7);
    else if (clean.endsWith('/api/v1/')) clean = clean.slice(0, -8);
    else if (clean.endsWith('/api')) clean = clean.slice(0, -4);
    else if (clean.endsWith('/api/')) clean = clean.slice(0, -5);
    return clean.endsWith('/') ? clean.slice(0, -1) : clean;
  }
  return 'http://127.0.0.1:8000';
}

export const API_BASE_URL = getApiBaseUrl();
export const BACKEND_BASE_URL = getBackendBaseUrl();

function isTrustedApiUrl(url) {
  if (!url) return false;
  const isAbsolute = typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
  if (!isAbsolute) return true; // relative paths are always our own backend

  try {
    const parsed = new URL(url);
    const backendBase = getBackendBaseUrl();
    const parsedBackend = new URL(backendBase);

    if (parsed.origin === parsedBackend.origin) return true;

    const isLocalHost = (host) =>
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.');

    if (isLocalHost(parsed.hostname) && (parsed.port === parsedBackend.port || parsed.port === '8000')) {
      return true;
    }
  } catch (e) {
    const backendBase = getBackendBaseUrl();
    if (url.startsWith(backendBase)) return true;
  }
  return false;
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
    let errorMessage = null;

    if (contentType && contentType.includes('application/json') && data && typeof data === 'object') {
      errorMessage = data.error || data.detail || (typeof data.message === 'string' && !data.message.includes('<!DOCTYPE') && !data.message.includes('<html') ? data.message : null);
      if (!errorMessage) {
        const fields = Object.values(data).filter(v => Array.isArray(v)).flat();
        if (fields.length > 0) {
          errorMessage = fields.join(', ');
        }
      }
    }

    if (!errorMessage || response.status >= 500) {
      if (response.status >= 500 || (typeof data?.message === 'string' && (data.message.includes('<!DOCTYPE') || data.message.includes('<html')))) {
        errorMessage = 'Something went wrong. Please try again later.';
      } else {
        errorMessage = response.statusText || 'API Request Failed';
      }
    }

    const err = new Error(errorMessage);
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
        if (typeof window !== 'undefined' && (response.status === 401 || response.status === 403)) {
          window.dispatchEvent(new CustomEvent('cubelogs:auth_unauthenticated'));
        }
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
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cubelogs:auth_unauthenticated'));
        }
        throw new Error('Invalid token refresh response');
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiFetch(path, options = {}) {
  const isAbsolute = typeof path === 'string' && (path.startsWith('http://') || path.startsWith('https://'));
  const baseUrl = getApiBaseUrl();

  let url;
  let cleanPath;
  if (isAbsolute) {
    url = path;
    try {
      cleanPath = new URL(path).pathname;
    } catch {
      cleanPath = path;
    }
  } else {
    let relPath = path.startsWith('/') ? path : `/${path}`;
    if (relPath.startsWith('/api/v1/')) {
      relPath = relPath.slice(7);
    } else if (relPath === '/api/v1') {
      relPath = '/';
    } else if (relPath.startsWith('/v1/')) {
      relPath = relPath.slice(3);
    } else if (relPath === '/v1') {
      relPath = '/';
    } else if (relPath.startsWith('/api/')) {
      relPath = relPath.slice(4);
    } else if (relPath === '/api') {
      relPath = '/';
    }
    if (!relPath.startsWith('/')) {
      relPath = `/${relPath}`;
    }
    cleanPath = relPath;
    const cleanBase = baseUrl.replace(/\/+$/, '');
    url = `${cleanBase}${relPath}`;
  }

  const isTrusted = isTrustedApiUrl(url);

  const headers = { ...(options.headers || {}) };

  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (isTrusted && !headers.Authorization) {
    const accessToken = getAccessToken();
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  if (isTrusted && !headers['X-Organization-ID'] && !headers['x-organization-id']) {
    const activeOrgId = getActiveOrgId();
    if (activeOrgId) {
      headers['X-Organization-ID'] = String(activeOrgId);
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
    if (err.name === 'AbortError' || err.name === 'CanceledError') {
      throw err;
    }
    console.error(`apiFetch network failure for URL: ${url}`, err);
    throw new Error(`Failed to fetch resources from: ${url}. Network error.`);
  }

  const isAuthEndpoint =
    cleanPath.includes('/auth/login') ||
    cleanPath.includes('/auth/refresh') ||
    cleanPath.includes('/auth/magic-login') ||
    cleanPath.includes('/auth/password-reset');

  if (
    isTrusted &&
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

      if (isTrusted && !retryHeaders['X-Organization-ID'] && !retryHeaders['x-organization-id']) {
        const activeOrgId = getActiveOrgId();
        if (activeOrgId) {
          retryHeaders['X-Organization-ID'] = String(activeOrgId);
        }
      }

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

      if (options.rawResponse) {
        return retryResponse;
      }
      if (options.responseType === 'blob') {
        if (!retryResponse.ok) {
          const err = new Error(retryResponse.statusText || 'Failed to fetch blob');
          err.status = retryResponse.status;
          throw err;
        }
        return retryResponse.blob();
      }

      return parseResponse(retryResponse);
    } catch (refreshErr) {
      if (options.rawResponse) return response;
      if (options.responseType === 'blob') {
        const err = new Error(response.statusText || 'Failed to fetch blob');
        err.status = response.status;
        throw err;
      }
      return parseResponse(response);
    }
  }

  if (options.rawResponse) {
    return response;
  }
  if (options.responseType === 'blob') {
    if (!response.ok) {
      const err = new Error(response.statusText || 'Failed to fetch blob');
      err.status = response.status;
      throw err;
    }
    return response.blob();
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
