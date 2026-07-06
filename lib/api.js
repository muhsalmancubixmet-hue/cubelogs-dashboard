const getApiBaseUrl = () => {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (base) {
    return base.endsWith('/') ? `${base}api` : `${base}/api`;
  }
  return 'http://127.0.0.1:8000/api';
};

const API_BASE_URL = getApiBaseUrl();

export async function apiFetch(path, options = {}) {
  // Ensure path starts with a slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${cleanPath}`;
  
  const headers = { ...(options.headers || {}) };
  
  if (typeof window !== 'undefined') {
    const accessToken = localStorage.getItem('cubelogs_access_token');
    if (accessToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
  }
  
  // Set JSON content type if body is present and not FormData
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  
  const config = {
    ...options,
    headers,
  };
  
  let response;
  try {
    response = await fetch(url, config);
  } catch (err) {
    console.error(`apiFetch failed for URL: ${url}`, err);
    throw new Error(`Failed to fetch resources from: ${url}. Network error.`);
  }
  
  // Handle 401 Unauthorized (JWT expired)
  if (response.status === 401 && typeof window !== 'undefined' && !cleanPath.includes('/auth/login') && !cleanPath.includes('/auth/refresh')) {
    const refreshToken = localStorage.getItem('cubelogs_refresh_token');
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: refreshToken }),
        });
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          localStorage.setItem('cubelogs_access_token', refreshData.access);
          
          // Retry original request with new token
          headers['Authorization'] = `Bearer ${refreshData.access}`;
          try {
            response = await fetch(url, {
              ...config,
              headers
            });
          } catch (retryErr) {
            console.error(`apiFetch retry failed for URL: ${url}`, retryErr);
            throw new Error(`Failed to fetch resources from: ${url} after token refresh.`);
          }
        } else {
          logoutAndRedirect();
          throw new Error('Session expired. Please log in again.');
        }
      } catch (e) {
        logoutAndRedirect();
        throw new Error('Session expired. Please log in again.');
      }
    } else {
      logoutAndRedirect();
      throw new Error('Authentication required.');
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
    throw new Error(data.error || data.detail || response.statusText || 'API Request Failed');
  }
  return data;
}

export function logoutAndRedirect() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('cubelogs_access_token');
    localStorage.removeItem('cubelogs_refresh_token');
    localStorage.removeItem('cubelogs_active_user');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
}
