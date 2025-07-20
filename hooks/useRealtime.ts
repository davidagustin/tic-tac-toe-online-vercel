'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

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
  
  const maxRetries = config.maxRetries || 3;
  const fallbackInterval = config.fallbackInterval || 5000;

  // SSE Connection
  const connectSSE = useCallback(() => {
    try {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const url = `/api/events?channel=${config.channel}${lastMessageIdRef.current ? `&lastEventId=${lastMessageIdRef.current}` : ''}`;
      const eventSource = new EventSource(url);
      
      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        setConnectionMethod('sse');
        retryCountRef.current = 0;
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
        eventSource.close();
        
        // Fallback to polling
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          setTimeout(() => connectPolling(), 1000);
        }
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('Error setting up SSE:', error);
      setError('Failed to connect via SSE');
      // Fallback to polling
      connectPolling();
    }
  }, [config.channel, maxRetries]);

  // Polling Fallback
  const connectPolling = useCallback(() => {
    try {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      setConnectionMethod('polling');
      setIsConnected(true);
      setError(null);

      const poll = async () => {
        try {
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
          setIsConnected(false);
        }
      };

      // Initial poll
      poll();
      
      // Set up polling interval
      pollingIntervalRef.current = setInterval(poll, fallbackInterval);
    } catch (error) {
      console.error('Error setting up polling:', error);
      setError('Failed to connect via polling');
      setIsConnected(false);
    }
  }, [config.channel, fallbackInterval]);

  // Send message
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

  // Connect
  const connect = useCallback(() => {
    retryCountRef.current = 0;
    connectSSE();
  }, [connectSSE]);

  // Disconnect
  const disconnect = useCallback(() => {
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

  // Auto-connect on mount
  useEffect(() => {
    connect();
    
    return () => {
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