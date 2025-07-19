'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const MAX_RECONNECTION_ATTEMPTS = 5;
  const RECONNECTION_DELAY = 3000;

  const connect = useCallback(() => {
    if (connectionAttempts >= MAX_RECONNECTION_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
      setLastError('Unable to connect to server after multiple attempts');
      return;
    }

    try {
      const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: MAX_RECONNECTION_ATTEMPTS,
        reconnectionDelay: RECONNECTION_DELAY,
        reconnectionDelayMax: 10000,
        autoConnect: true,
        forceNew: true
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setIsConnected(true);
        setLastError(null);
        setConnectionAttempts(0);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setIsConnected(false);
        
        if (reason === 'io server disconnect') {
          // Server disconnected us, don't try to reconnect
          setLastError('Server disconnected');
        } else if (reason === 'io client disconnect') {
          // Client disconnected, don't try to reconnect
          setLastError('Client disconnected');
        } else {
          // Network error, will try to reconnect
          setConnectionAttempts(prev => prev + 1);
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
        setLastError(`Connection failed: ${error.message}`);
        setConnectionAttempts(prev => prev + 1);
        
        // Log additional error details for debugging
        if (error.message) {
          console.error('Connection error details:', {
            message: error.message,
            stack: error.stack
          });
        }
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts');
        setIsConnected(true);
        setLastError(null);
        setConnectionAttempts(0);
      });

      newSocket.on('reconnect_error', (error) => {
        console.error('Socket reconnection error:', error);
        setLastError(`Reconnection failed: ${error.message}`);
      });

      newSocket.on('reconnect_failed', () => {
        console.error('Socket reconnection failed');
        setLastError('Unable to reconnect to server');
        setIsConnected(false);
      });

      // Security error handling
      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
        
        if (error.message?.includes('Rate limit')) {
          setLastError('Rate limit exceeded. Please wait before trying again.');
        } else if (error.message?.includes('Invalid')) {
          setLastError('Invalid data sent. Please check your input.');
        } else if (error.message?.includes('Security')) {
          setLastError('Security violation detected.');
        } else {
          setLastError(`Socket error: ${error.message || 'Unknown error'}`);
        }
      });

      // Security event handlers
      newSocket.on('security_violation', (data) => {
        console.error('Security violation:', data);
        setLastError('Security violation detected. Please refresh the page.');
      });

      newSocket.on('rate_limit_exceeded', (data) => {
        console.warn('Rate limit exceeded:', data);
        setLastError('Rate limit exceeded. Please wait before trying again.');
      });

      setSocket(newSocket);
    } catch (error) {
      console.error('Failed to create socket connection:', error);
      setLastError('Failed to establish connection');
      setConnectionAttempts(prev => prev + 1);
    }
  }, [connectionAttempts]);

  useEffect(() => {
    connect();

    return () => {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
    };
  }, [connect]);

  // Auto-reconnect on connection loss
  useEffect(() => {
    if (!isConnected && connectionAttempts < MAX_RECONNECTION_ATTEMPTS) {
      const timeout = setTimeout(() => {
        connect();
      }, RECONNECTION_DELAY);

      return () => clearTimeout(timeout);
    }
  }, [isConnected, connectionAttempts, connect]);

  // Clear error after some time
  useEffect(() => {
    if (lastError) {
      const timeout = setTimeout(() => {
        setLastError(null);
      }, 10000); // Clear error after 10 seconds

      return () => clearTimeout(timeout);
    }
  }, [lastError]);

  return { 
    socket, 
    isConnected, 
    lastError,
    reconnect: connect,
    connectionAttempts 
  };
} 