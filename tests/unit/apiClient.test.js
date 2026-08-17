import { apiFetch, apiLogout, getApiBaseUrl, getBackendBaseUrl } from '../../lib/api/apiClient';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../../lib/api/tokenStorage';

describe('Centralized apiClient & JWT Security Verification', () => {
  let originalFetch;

  beforeEach(() => {
    jest.resetAllMocks();
    originalFetch = global.fetch;
    global.fetch = jest.fn();
    clearTokens();

    // Mock document.cookie for CSRF token
    Object.defineProperty(document, 'cookie', {
      value: 'csrftoken=test-csrf-token-123',
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    clearTokens();
  });

  test('apiFetch includes Authorization: Bearer when access token is stored', async () => {
    setTokens('mock-access-token-xyz', 'mock-refresh-token-abc');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ success: true }),
    });

    await apiFetch('/employees/');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, config] = global.fetch.mock.calls[0];
    expect(config.headers['Authorization']).toBe('Bearer mock-access-token-xyz');
  });

  test('apiFetch automatically refreshes token on 401 and retries original request', async () => {
    setTokens('expired-access-token', 'valid-refresh-token');

    // 1st call: 401 Unauthorized
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ detail: 'Given token not valid for any token type' }),
    });

    // 2nd call: POST /auth/refresh/ succeeds with new token
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ access: 'new-fresh-access-token', refresh: 'new-rotated-refresh' }),
    });

    // 3rd call: retry of /employees/ with new token
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ results: [{ id: 1, name: 'Alice' }] }),
    });

    const result = await apiFetch('/employees/');

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(getAccessToken()).toBe('new-fresh-access-token');
    expect(result).toEqual({ results: [{ id: 1, name: 'Alice' }] });

    // Check retry call headers
    const [, retryConfig] = global.fetch.mock.calls[2];
    expect(retryConfig.headers['Authorization']).toBe('Bearer new-fresh-access-token');
  });

  test('Unsafe HTTP methods (POST, PUT, PATCH, DELETE) include Content-Type and Authorization', async () => {
    setTokens('valid-token-123', null);

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
    expect(config.headers['Authorization']).toBe('Bearer valid-token-123');
    expect(config.headers['Content-Type']).toBe('application/json');
  });

  test('FormData requests do not receive an explicit JSON Content-Type header', async () => {
    setTokens('valid-token-123', null);

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
    expect(config.headers['Authorization']).toBe('Bearer valid-token-123');
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

  test('apiLogout sends refresh token to POST /auth/logout/ and clears tokens', async () => {
    setTokens('my-access-token', 'my-refresh-token');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ message: 'Logged out successfully' }),
    });

    await apiLogout();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, config] = global.fetch.mock.calls[0];
    expect(url).toContain('/auth/logout/');
    expect(config.method).toBe('POST');
    expect(JSON.parse(config.body)).toEqual({ refresh: 'my-refresh-token' });
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  test('concurrent 401 requests trigger only one refresh call (mutex deduplication)', async () => {
    setTokens('expired-access-token', 'valid-refresh-token');

    // Simulate 2 parallel calls returning 401
    // Call 1: 401
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ detail: 'Token expired' }),
    });

    // Call 2: 401
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ detail: 'Token expired' }),
    });

    // Refresh call (only ONE should happen!)
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ access: 'mutex-new-access', refresh: 'mutex-new-refresh' }),
    });

    // Retry call 1
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ data: 'item1' }),
    });

    // Retry call 2
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ data: 'item2' }),
    });

    const [res1, res2] = await Promise.all([
      apiFetch('/items/1/'),
      apiFetch('/items/2/'),
    ]);

    expect(res1).toEqual({ data: 'item1' });
    expect(res2).toEqual({ data: 'item2' });

    // Total fetch calls: 2 initial + 1 refresh + 2 retries = 5 calls
    expect(global.fetch).toHaveBeenCalledTimes(5);
    const refreshCalls = global.fetch.mock.calls.filter(([url]) => url.includes('/auth/refresh/'));
    expect(refreshCalls.length).toBe(1);
    expect(getAccessToken()).toBe('mutex-new-access');
  });

  test('failed token refresh clears tokens and throws error', async () => {
    setTokens('expired-access-token', 'invalid-refresh-token');

    // 1st call: 401
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ detail: 'Token expired' }),
    });

    // 2nd call: POST /auth/refresh/ fails with 401 (e.g. blacklisted/expired refresh token)
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ detail: 'Token is blacklisted' }),
    });

    await expect(apiFetch('/protected-endpoint/')).rejects.toThrow();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});
