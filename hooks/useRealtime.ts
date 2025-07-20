'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface RealtimeMessage {
  id: string;
  event: string;
  data: Record<string, unknown>;
  timestamp: number;
}

interface RealtimeConfig {
  channel: string;
  fallbackInterval?: number;
  maxRetries?: number;
}

export function useRealtime(config: RealtimeConfig) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connectionMethod, setConnectionMethod] = useState<'sse' | 'polling'>('sse');

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const lastMessageIdRef = useRef<string | null>(null);
  const connectionActiveRef = useRef(false);

  const maxRetries = config.maxRetries || 2; // Reduced from 3 to 2
  const fallbackInterval = config.fallbackInterval || 60000; // Increased from 5000 to 60000ms (1 minute)

  // SSE Connection with improved error handling
  const connectSSE = useCallback(() => {
    // Prevent multiple simultaneous connections
    if (connectionActiveRef.current) {
      console.log('SSE connection already active, skipping...');
      return;
    }

    try {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      connectionActiveRef.current = true;
      const url = `/api/events?channel=${config.channel}${lastMessageIdRef.current ? `&lastEventId=${lastMessageIdRef.current}` : ''}`;
      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        setConnectionMethod('sse');
        retryCountRef.current = 0;
        console.log('SSE connected successfully');
      };

      eventSource.onmessage = (event) => {
        try {
          const message: RealtimeMessage = JSON.parse(event.data);
          lastMessageIdRef.current = message.id;

          if (message.event === 'heartbeat') {
            return; // Ignore heartbeat messages
          }

          setMessages(prev => [...prev, message]);
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = () => {
        console.error('SSE connection error');
        setError('SSE connection failed');
        setIsConnected(false);
        connectionActiveRef.current = false;
        eventSource.close();

        // Use exponential backoff before fallback
        const delay = Math.min(5000 * Math.pow(2, retryCountRef.current), 60000); // Cap at 1 minute

        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          console.log(`Retrying SSE connection in ${delay}ms (attempt ${retryCountRef.current})`);
          setTimeout(() => connectPolling(), delay);
        } else {
          console.log('Max SSE retries reached, switching to polling fallback');
          connectPolling();
        }
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('Error setting up SSE:', error);
      setError('Failed to connect via SSE');
      connectionActiveRef.current = false;
      // Fallback to polling with delay
      setTimeout(() => connectPolling(), 10000); // 10 second delay
    }
  }, [config.channel, maxRetries]);

  // Polling Fallback with much reduced frequency
  const connectPolling = useCallback(() => {
    try {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      setConnectionMethod('polling');
      setIsConnected(true);
      setError(null);
      connectionActiveRef.current = true;

      let pollCount = 0;
      const maxPolls = 10; // Limit number of polls

      const poll = async () => {
        if (pollCount >= maxPolls) {
          console.log('Max polling attempts reached, stopping');
          setIsConnected(false);
          setError('Polling limit exceeded');
          connectionActiveRef.current = false;
          return;
        }

        try {
          pollCount++;
          const response = await fetch(`/api/events?channel=${config.channel}&lastEventId=${lastMessageIdRef.current || ''}`);

          if (response.ok) {
            const data = await response.json();
            if (data.events && Array.isArray(data.events)) {
              data.events.forEach((message: RealtimeMessage) => {
                lastMessageIdRef.current = message.id;
                setMessages(prev => [...prev, message]);
              });
            }
          }
        } catch (error) {
          console.error('Polling error:', error);
          setError('Polling connection failed');
          // Don't immediately disconnect on error, retry
        }
      };

      // Initial poll
      poll();

      // Set up polling interval with much longer delay
      pollingIntervalRef.current = setInterval(poll, fallbackInterval);
    } catch (error) {
      console.error('Error setting up polling:', error);
      setError('Failed to connect via polling');
      setIsConnected(false);
      connectionActiveRef.current = false;
    }
  }, [config.channel, fallbackInterval]);

  // Send message with retry logic
  const sendMessage = useCallback(async (event: string, data: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: config.channel,
          event,
          data,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
      return false;
    }
  }, [config.channel]);

  // Connect with improved logic
  const connect = useCallback(() => {
    if (connectionActiveRef.current) {
      console.log('Connection already active');
      return;
    }

    retryCountRef.current = 0;
    connectSSE();
  }, [connectSSE]);

  // Disconnect
  const disconnect = useCallback(() => {
    connectionActiveRef.current = false;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    setIsConnected(false);
    setError(null);
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    lastMessageIdRef.current = null;
  }, []);

  // Auto-connect on mount with delay
  useEffect(() => {
    // Add a small delay to prevent immediate connection rush
    const timer = setTimeout(() => {
      connect();
    }, Math.random() * 3000); // Random delay up to 3 seconds

    return () => {
      clearTimeout(timer);
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    messages,
    error,
    connectionMethod,
    sendMessage,
    connect,
    disconnect,
    clearMessages,
  };
} 