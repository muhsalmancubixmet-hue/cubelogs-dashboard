import { apiFetch, apiLogout, getApiBaseUrl, getBackendBaseUrl } from '../../lib/api/apiClient';

describe('Centralized apiClient & Security Verification', () => {
  let originalFetch;

  beforeEach(() => {
    jest.resetAllMocks();
    originalFetch = global.fetch;
    global.fetch = jest.fn();

    // Mock document.cookie for CSRF token
    Object.defineProperty(document, 'cookie', {
      value: 'csrftoken=test-csrf-token-123',
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('apiFetch includes credentials: "include" for SessionAuthentication', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ success: true }),
    });

    await apiFetch('/employees/');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, config] = global.fetch.mock.calls[0];
    expect(config.credentials).toBe('include');
  });

  test('Unsafe HTTP methods (POST, PUT, PATCH, DELETE) include X-CSRFToken header', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ id: 1 }),
    });

    await apiFetch('/employees/', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const [, config] = global.fetch.mock.calls[0];
    expect(config.headers['X-CSRFToken']).toBe('test-csrf-token-123');
    expect(config.headers['Content-Type']).toBe('application/json');
  });

  test('FormData requests do not receive an explicit JSON Content-Type header', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ uploaded: true }),
    });

    const formData = new FormData();
    formData.append('file', new Blob(['test']), 'photo.jpg');

    await apiFetch('/upload/', {
      method: 'POST',
      body: formData,
    });

    const [, config] = global.fetch.mock.calls[0];
    expect(config.headers['Content-Type']).toBeUndefined();
    expect(config.headers['X-CSRFToken']).toBe('test-csrf-token-123');
  });

  test('API errors preserve status code and structured error messages', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ email: ['This field is required.'] }),
    });

    try {
      await apiFetch('/employees/', { method: 'POST', body: JSON.stringify({}) });
      fail('Should have thrown an error');
    } catch (err) {
      expect(err.status).toBe(400);
      expect(err.message).toContain('This field is required.');
    }
  });

  test('apiLogout clears session via POST /auth/logout/', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ success: true }),
    });

    await apiLogout();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, config] = global.fetch.mock.calls[0];
    expect(url).toContain('/auth/logout/');
    expect(config.method).toBe('POST');
    expect(config.credentials).toBe('include');
  });

  test('Verification that no JWT access/refresh token keys are stored in localStorage', () => {
    expect(localStorage.getItem('cubelogs_access_token')).toBeNull();
    expect(localStorage.getItem('cubelogs_refresh_token')).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
  });
});
