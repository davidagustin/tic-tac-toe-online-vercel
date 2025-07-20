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
  const isInitialConnectionRef = useRef(true);

  const maxRetries = config.maxRetries || 3; // Back to 3 for better reliability
  const fallbackInterval = config.fallbackInterval || 30000; // Reduced from 60s to 30s for better UX

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
        isInitialConnectionRef.current = false;
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

        // Use faster retry for initial connections
        const isInitial = isInitialConnectionRef.current;
        const delay = isInitial ? 2000 : Math.min(5000 * Math.pow(2, retryCountRef.current), 60000);

        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          console.log(`Retrying SSE connection in ${delay}ms (attempt ${retryCountRef.current}) ${isInitial ? '[initial]' : ''}`);
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
      // Faster fallback to polling for initial connections
      const delay = isInitialConnectionRef.current ? 3000 : 10000;
      setTimeout(() => connectPolling(), delay);
    }
  }, [config.channel, maxRetries]);

  // Polling Fallback with improved frequency for user experience
  const connectPolling = useCallback(() => {
    try {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      setConnectionMethod('polling');
      setIsConnected(true);
      setError(null);
      connectionActiveRef.current = true;
      isInitialConnectionRef.current = false;

      let pollCount = 0;
      const maxPolls = 20; // Increased from 10 to 20 for better user experience

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

      // Set up polling interval with optimized delay
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

  // Auto-connect on mount with minimal delay
  useEffect(() => {
    // Reduce delay for initial connection attempt
    const timer = setTimeout(() => {
      connect();
    }, Math.random() * 1000); // Random delay up to 1 second (reduced from 3)

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