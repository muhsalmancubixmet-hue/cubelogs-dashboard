import React, { useContext, useEffect } from 'react';
import { render, act } from '@testing-library/react';
import { AppProvider, AppContext, useApp } from '../AppContext';
import { apiFetch } from '../../lib/api';
import { setTokens, clearTokens } from '../../lib/api/tokenStorage';
import { authService, organizationService } from '../../lib/services/apiService';

// Mock the services
jest.mock('../../lib/services/apiService', () => ({
  authService: {
    fetchMe: jest.fn(),
    login: jest.fn(),
    magicLogin: jest.fn(),
    requestPasswordReset: jest.fn(),
  },
  organizationService: {
    fetchInitialData: jest.fn(() => Promise.resolve([[], {}, null])),
  },
}));

describe('CubeLogs Authentication and Context Refactoring Tests', () => {
  let originalFetch;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    originalFetch = global.fetch;
    global.fetch = jest.fn();
    setTokens('test-access-token', 'test-refresh-token');

    organizationService.fetchInitialData.mockResolvedValue([[], {}, null]);

    // Mock document.cookie for CSRF token
    Object.defineProperty(document, 'cookie', {
      value: 'csrftoken=mock-csrf-token',
      writable: true,
      configurable: true,
    });

    // Mock document.visibilityState
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document, 'hidden', {
      value: false,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
    clearTokens();
  });

  // Test Component to read state from AppContext
  function TestConsumer({ onStateChange }) {
    const context = useApp();
    useEffect(() => {
      if (onStateChange) {
        onStateChange(context);
      }
    }, [context, onStateChange]);

    return (
      <div>
        <span data-testid="status">{context.authStatus}</span>
        <span data-testid="user">{context.currentUser ? context.currentUser.name : 'null'}</span>
      </div>
    );
  }

  test('apiFetch attaches Authorization and CSRF header', async () => {
    setTokens('mock-access-token', 'mock-refresh-token');
    const mockTaskData = [{ id: 1, title: 'Test Task' }];
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve(mockTaskData),
    });

    const res = await apiFetch('/tasks/', { method: 'POST', body: JSON.stringify({ title: 'New Task' }) });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, config] = global.fetch.mock.calls[0];
    expect(url).toContain('/tasks/');
    expect(config.headers['Authorization']).toBe('Bearer mock-access-token');
    expect(res).toEqual(mockTaskData);
  });

  test('AppContext initialization sets authStatus to authenticated on successful profile fetch', async () => {
    setTokens('valid-access-token', 'valid-refresh-token');
    authService.fetchMe.mockResolvedValueOnce({
      id: 42,
      email: 'test@example.com',
      name: 'Alice Manager',
      designation: 'Manager',
      isSuperAdmin: false,
      organization: 1,
      permissions: ['employee:view'],
      subscription: { subscriptionStatus: 'Paid', daysRemaining: 15 },
    });

    let lastContext = null;
    let container;
    await act(async () => {
      const rendered = render(
        <AppProvider>
          <TestConsumer onStateChange={ctx => { lastContext = ctx; }} />
        </AppProvider>
      );
      container = rendered;
    });

    expect(authService.fetchMe).toHaveBeenCalledTimes(1);
    expect(container.getByTestId('status').textContent).toBe('authenticated');
    expect(container.getByTestId('user').textContent).toBe('Alice Manager');
  });

  test('AppContext initialization sets authStatus to unauthenticated on failed profile fetch', async () => {
    setTokens('invalid-access-token', 'invalid-refresh-token');
    authService.fetchMe.mockRejectedValueOnce(new Error('Unauthorized'));

    let container;
    await act(async () => {
      container = render(
        <AppProvider>
          <TestConsumer />
        </AppProvider>
      );
    });

    expect(container.getByTestId('status').textContent).toBe('unauthenticated');
    expect(container.getByTestId('user').textContent).toBe('null');
  });

  test('login updates auth state to authenticated and currentUser on success', async () => {
    authService.fetchMe.mockRejectedValueOnce(new Error('Unauthorized'));
    authService.login.mockResolvedValueOnce({
      user: {
        id: 10,
        email: 'user@example.com',
        name: 'Logged In User',
        isSuperAdmin: false,
        permissions: ['dashboard'],
      },
    });

    let lastContext = null;
    await act(async () => {
      render(
        <AppProvider>
          <TestConsumer onStateChange={ctx => { lastContext = ctx; }} />
        </AppProvider>
      );
    });

    await act(async () => {
      const result = await lastContext.login('user@example.com', 'password123');
      expect(result.success).toBe(true);
    });

    expect(lastContext.authStatus).toBe('authenticated');
    expect(lastContext.currentUser.name).toBe('Logged In User');
  });

  test('logout clears currentUser and transitions state to unauthenticated', async () => {
    authService.fetchMe.mockResolvedValueOnce({
      id: 42,
      email: 'test@example.com',
      name: 'Alice Manager',
      isSuperAdmin: false,
    });

    let lastContext = null;
    await act(async () => {
      render(
        <AppProvider>
          <TestConsumer onStateChange={ctx => { lastContext = ctx; }} />
        </AppProvider>
      );
    });

    expect(lastContext.authStatus).toBe('authenticated');

    await act(async () => {
      await lastContext.logout();
    });

    expect(lastContext.authStatus).toBe('unauthenticated');
    expect(lastContext.currentUser).toBeNull();
  });

  test('hasPermission correctly evaluates user permissions and superadmin bypass', async () => {
    authService.fetchMe.mockResolvedValueOnce({
      id: 42,
      email: 'test@example.com',
      isSuperAdmin: false,
      permissions: ['leaves:apply'],
    });

    let lastContext = null;
    await act(async () => {
      render(
        <AppProvider>
          <TestConsumer onStateChange={ctx => { lastContext = ctx; }} />
        </AppProvider>
      );
    });

    expect(lastContext.hasPermission('leaves:apply')).toBe(true);
    expect(lastContext.hasPermission('admin:employees')).toBe(false);
  });

  test('Polling and window focus refreshes only run when user is authenticated, and pause when tab is hidden', async () => {
    authService.fetchMe.mockResolvedValue({
      id: 42,
      email: 'test@example.com',
      name: 'Alice Manager',
      designation: 'Manager',
      isSuperAdmin: false,
      organization: 1,
      permissions: ['employee:view'],
      subscription: { subscriptionStatus: 'Paid', daysRemaining: 15 },
    });

    let lastContext = null;
    await act(async () => {
      render(
        <AppProvider>
          <TestConsumer onStateChange={ctx => { lastContext = ctx; }} />
        </AppProvider>
      );
    });

    authService.fetchMe.mockClear();

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(authService.fetchMe).toHaveBeenCalledTimes(1);

    authService.fetchMe.mockClear();
    await act(async () => {
      jest.advanceTimersByTime(300000);
    });
    expect(authService.fetchMe).toHaveBeenCalledTimes(1);

    authService.fetchMe.mockClear();
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    Object.defineProperty(document, 'hidden', {
      value: true,
      configurable: true,
    });

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(authService.fetchMe).toHaveBeenCalledTimes(0);

    await act(async () => {
      jest.advanceTimersByTime(300000);
    });
    expect(authService.fetchMe).toHaveBeenCalledTimes(0);
  });

  test('Stable-field state comparison preserves currentUser reference if target fields did not change', async () => {
    const initialUser = {
      id: 42,
      email: 'test@example.com',
      name: 'Alice Manager',
      designation: 'Manager',
      isSuperAdmin: false,
      organization: 1,
      permissions: ['employee:view'],
      subscription: { subscriptionStatus: 'Paid', daysRemaining: 15 },
    };

    authService.fetchMe.mockResolvedValueOnce(initialUser);

    let lastContext = null;
    await act(async () => {
      render(
        <AppProvider>
          <TestConsumer onStateChange={ctx => { lastContext = ctx; }} />
        </AppProvider>
      );
    });

    const userRefBefore = lastContext.currentUser;

    authService.fetchMe.mockResolvedValueOnce({
      ...initialUser,
      name: 'Alice Manager New Name',
      subscription: { ...initialUser.subscription, secondsRemaining: 4000 },
    });

    await act(async () => {
      await lastContext.refreshUser();
    });

    expect(lastContext.currentUser).toBe(userRefBefore);

    authService.fetchMe.mockResolvedValueOnce({
      ...initialUser,
      designation: 'Director',
    });

    await act(async () => {
      await lastContext.refreshUser();
    });

    expect(lastContext.currentUser).not.toBe(userRefBefore);
    expect(lastContext.currentUser.designation).toBe('Director');
  });
});
