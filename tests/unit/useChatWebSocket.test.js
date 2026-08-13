import { renderHook, act } from '@testing-library/react';
import { useChatWebSocket } from '../../lib/hooks/useChatWebSocket';

class MockWebSocket {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    MockWebSocket.instances.push(this);

    setTimeout(() => {
      this.readyState = 1; // OPEN
      if (this.onopen) this.onopen();
    }, 10);
  }

  close(code, reason) {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose({ code: code || 1000, reason: reason || '' });
    }
  }
}

global.WebSocket = MockWebSocket;

describe('useChatWebSocket hook', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('does not reconnect when server closes with code 4003', () => {
    const { result } = renderHook(() =>
      useChatWebSocket({ roomType: 'story', roomId: '150' })
    );

    act(() => {
      jest.advanceTimersByTime(20);
    });

    expect(result.current.isConnected).toBe(true);
    const lastSocket = MockWebSocket.instances[MockWebSocket.instances.length - 1];

    // Server closes with 4003 Forbidden
    act(() => {
      lastSocket.close(4003, 'Forbidden');
    });

    expect(result.current.isForbidden).toBe(true);
    const instanceCount = MockWebSocket.instances.length;

    // Fast forward timer to check no reconnect occurs
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(MockWebSocket.instances.length).toBe(instanceCount);
  });

  test('reconnects on normal disconnection (code 1006)', () => {
    const { result } = renderHook(() =>
      useChatWebSocket({ roomType: 'story', roomId: '150' })
    );

    act(() => {
      jest.advanceTimersByTime(20);
    });

    expect(result.current.isConnected).toBe(true);
    const firstSocket = MockWebSocket.instances[0];

    // Abnormal closure (network drop)
    act(() => {
      firstSocket.close(1006, 'Abnormal');
    });

    expect(result.current.isDisconnected).toBe(true);

    // Fast-forward backoff delay (1000ms)
    act(() => {
      jest.advanceTimersByTime(1200);
    });

    expect(MockWebSocket.instances.length).toBe(2);
  });

  test('cleanly closes socket on unmount without scheduling reconnect', () => {
    const { unmount } = renderHook(() =>
      useChatWebSocket({ roomType: 'story', roomId: '150' })
    );

    act(() => {
      jest.advanceTimersByTime(20);
    });

    const instanceCount = MockWebSocket.instances.length;

    unmount();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(MockWebSocket.instances.length).toBe(instanceCount);
  });
});
