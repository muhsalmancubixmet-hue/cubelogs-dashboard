import { useEffect, useRef, useState, useCallback } from 'react';
import { getBackendBaseUrl } from '../api/apiClient';

export function getWebSocketBaseUrl() {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    const raw = process.env.NEXT_PUBLIC_WS_URL.trim().replace(/,$/, '').trim();
    return raw.endsWith('/') ? raw.slice(0, -1) : raw;
  }
  const backendUrl = getBackendBaseUrl();
  if (backendUrl.startsWith('https://')) {
    return backendUrl.replace('https://', 'wss://');
  }
  return backendUrl.replace('http://', 'ws://');
}

/**
 * Custom React Hook for Real-Time Chat WebSocket Synchronization
 * Handles automatic connection, room joining, exponential backoff reconnection,
 * and live message_created, message_updated, message_deleted events.
 */
export function useChatWebSocket({ roomType, roomId, onMessageCreated, onMessageUpdated, onMessageDeleted, onTypingIndicator }) {
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connecting' | 'connected' | 'disconnected'
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const isComponentMounted = useRef(true);

  // Store latest callbacks in refs to avoid reconnecting on callback changes
  const onCreatedRef = useRef(onMessageCreated);
  const onUpdatedRef = useRef(onMessageUpdated);
  const onDeletedRef = useRef(onMessageDeleted);
  const onTypingRef = useRef(onTypingIndicator);

  useEffect(() => { onCreatedRef.current = onMessageCreated; }, [onMessageCreated]);
  useEffect(() => { onUpdatedRef.current = onMessageUpdated; }, [onMessageUpdated]);
  useEffect(() => { onDeletedRef.current = onMessageDeleted; }, [onMessageDeleted]);
  useEffect(() => { onTypingRef.current = onTypingIndicator; }, [onTypingIndicator]);

  const sendTypingStart = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify({ type: 'typing_start' }));
      } catch (e) {}
    }
  }, []);

  const sendTypingStop = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify({ type: 'typing_stop' }));
      } catch (e) {}
    }
  }, []);

  const stableTimerRef = useRef(null);

  const connect = useCallback(() => {
    if (!roomType || !roomId) return;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (stableTimerRef.current) {
      clearTimeout(stableTimerRef.current);
      stableTimerRef.current = null;
    }

    // Clean up existing connection if open without triggering onclose
    if (socketRef.current) {
      try {
        socketRef.current.onclose = null;
        socketRef.current.close();
      } catch (e) {}
      socketRef.current = null;
    }

    setConnectionStatus('connecting');

    const wsBaseUrl = getWebSocketBaseUrl();
    const wsUrl = `${wsBaseUrl}/ws/chat/${roomType}/${roomId}/`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!isComponentMounted.current) return;
        setConnectionStatus('connected');
        // Reset reconnect attempts counter only after staying connected for 5s
        stableTimerRef.current = setTimeout(() => {
          if (socketRef.current === ws) {
            reconnectAttemptsRef.current = 0;
          }
        }, 5000);
      };

      ws.onmessage = (event) => {
        if (!isComponentMounted.current) return;
        try {
          const payload = JSON.parse(event.data);
          const eventType = payload.event_type || payload.type;
          const data = payload.data;

          if (eventType === 'message_created' && onCreatedRef.current) {
            onCreatedRef.current(data);
          } else if (eventType === 'message_updated' && onUpdatedRef.current) {
            onUpdatedRef.current(data);
          } else if (eventType === 'message_deleted' && onDeletedRef.current) {
            onDeletedRef.current(data);
          } else if (eventType === 'typing_indicator' && onTypingRef.current) {
            onTypingRef.current(data);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (err) => {
        // Connection error handler
      };

      ws.onclose = (event) => {
        if (stableTimerRef.current) {
          clearTimeout(stableTimerRef.current);
          stableTimerRef.current = null;
        }

        if (!isComponentMounted.current) return;

        // If closed with 4003 Forbidden, stop reconnecting permanently
        if (event && event.code === 4003) {
          setConnectionStatus('forbidden');
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          return;
        }

        setConnectionStatus('disconnected');

        // Exponential backoff reconnect logic (max delay ~16s)
        const attempts = reconnectAttemptsRef.current;
        const delay = Math.min(1000 * Math.pow(2, attempts), 16000);
        reconnectAttemptsRef.current = attempts + 1;

        reconnectTimeoutRef.current = setTimeout(() => {
          if (isComponentMounted.current) {
            connect();
          }
        }, delay);
      };
    } catch (err) {
      setConnectionStatus('disconnected');
    }
  }, [roomType, roomId]);

  useEffect(() => {
    isComponentMounted.current = true;
    connect();

    return () => {
      isComponentMounted.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (stableTimerRef.current) {
        clearTimeout(stableTimerRef.current);
        stableTimerRef.current = null;
      }
      if (socketRef.current) {
        try {
          socketRef.current.onclose = null;
          socketRef.current.close();
        } catch (e) {}
        socketRef.current = null;
      }
    };
  }, [connect]);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    isDisconnected: connectionStatus === 'disconnected' || connectionStatus === 'forbidden',
    isForbidden: connectionStatus === 'forbidden',
    sendTypingStart,
    sendTypingStop,
  };
}
