'use client';

import { CHANNELS, type ChatMessage, clearChannelCache, type Game, type PlayerStats, subscribeToChannel, unsubscribeFromChannel } from '@/lib/pusher-client';
import type { Channel } from 'pusher-js';
import Pusher from 'pusher-js';
import { useCallback, useEffect, useRef, useState } from 'react';

// Enhanced configuration for stability
const CONNECTION_TIMEOUT = 30000; // 30 seconds
const MAX_RECONNECT_ATTEMPTS = 5; // Increased from 3
const RECONNECT_DELAY = 5000; // 5 seconds base delay
const CONFIG_CACHE_TIME = 300000; // 5 minutes
const HEARTBEAT_INTERVAL = 25000; // 25 seconds
const RATE_LIMIT_DELAY = 1000; // 1 second between rapid events

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Debounce utility
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Rate limiting utility
function checkRateLimit(action: string, limit: number = 10, window: number = 60000): boolean {
  const now = Date.now();
  const key = `rate_limit:${action}`;

  const current = rateLimitStore.get(key);

  if (!current || current.resetTime < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + window
    });
    return true;
  }

  if (current.count >= limit) {
    return false;
  }

  current.count++;
  return true;
}

export function usePusher() {
  const [pusher, setPusher] = useState<Pusher | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [games, setGames] = useState<Game[]>([]);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);

  // Refs to prevent race conditions
  const isConnectingRef = useRef(false);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const configCacheRef = useRef<{ config: any; timestamp: number } | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lobbyChannel = useRef<Channel | null>(null);
  const gameChannel = useRef<Channel | null>(null);
  const userChannel = useRef<Channel | null>(null);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced cleanup function to prevent multiple simultaneous calls
  const debouncedCleanup = useCallback(
    debounce(async () => {
      console.log('🧹 Debounced cleanup triggered...');
      try {
        // Clear games state
        setGames([]);
        setCurrentGame(null);
        setChatMessages([]);

        // Clear localStorage
        localStorage.removeItem('ticTacToeUser');
        localStorage.removeItem('currentUser');
        sessionStorage.clear();

        console.log('✅ Cleanup completed');
      } catch (error) {
        console.error('❌ Cleanup error:', error);
      }
    }, 1000), // 1 second debounce
    [setGames, setCurrentGame, setChatMessages]
  );

  // Get Pusher configuration with caching
  const getPusherConfig = useCallback(async () => {
    if (configCacheRef.current && Date.now() - configCacheRef.current.timestamp < CONFIG_CACHE_TIME) {
      return configCacheRef.current.config;
    }

    try {
      const response = await fetch('/api/pusher-config');
      if (!response.ok) {
        throw new Error('Failed to fetch Pusher config');
      }
      const config = await response.json();

      configCacheRef.current = {
        config,
        timestamp: Date.now()
      };

      return config;
    } catch (error) {
      console.error('❌ Error fetching Pusher config:', error);
      throw error;
    }
  }, []);

  // Heartbeat system to keep connection alive
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (pusher?.connection.state === 'connected') {
        // Send a lightweight event to keep connection alive
        try {
          pusher.connection.send_event('heartbeat', { timestamp: Date.now() });
        } catch (error) {
          console.warn('Heartbeat failed:', error);
        }
      }
    }, HEARTBEAT_INTERVAL);
  }, [pusher]);

  // Initialize Pusher connection with enhanced stability
  const connect = useCallback(async () => {
    if (isConnectingRef.current || pusher?.connection.state === 'connected') {
      console.log('🔌 Already connecting or connected, skipping...');
      return;
    }

    try {
      isConnectingRef.current = true;
      setIsInitializing(true);
      setConnectionError(null);

      console.log('🔌 Initializing Pusher connection...');
      const config = await getPusherConfig();

      if (!config.key || !config.cluster) {
        throw new Error('Invalid Pusher configuration');
      }

      // Create new Pusher instance with enhanced settings
      const newPusher = new Pusher(config.key, {
        cluster: config.cluster,
        forceTLS: true,
        activityTimeout: 30000,
        pongTimeout: 15000,
      });

      // Set up connection event handlers
      newPusher.connection.bind('connected', () => {
        console.log('✅ Pusher connected successfully');
        setIsConnected(true);
        setIsInitializing(false);
        setConnectionError(null);
        setReconnectAttempts(0);
        isConnectingRef.current = false;
        startHeartbeat();
      });

      newPusher.connection.bind('disconnected', () => {
        console.log('❌ Pusher disconnected');
        setIsConnected(false);
        setIsInitializing(false);
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
      });

      newPusher.connection.bind('error', (error: any) => {
        console.error('❌ Pusher connection error:', error);
        setConnectionError(error.message || 'Connection failed');
        setIsConnected(false);
        setIsInitializing(false);
        isConnectingRef.current = false;
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
      });

      newPusher.connection.bind('reconnecting', () => {
        console.log('🔄 Pusher reconnecting...');
        setIsConnected(false);
        setReconnectAttempts(prev => prev + 1);
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
      });

      newPusher.connection.bind('reconnected', () => {
        console.log('✅ Pusher reconnected successfully');
        setIsConnected(true);
        setReconnectAttempts(0);
        startHeartbeat();
      });

      setPusher(newPusher);

      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (newPusher.connection.state !== 'connected') {
          console.error('❌ Connection timeout');
          setConnectionError('Connection timeout');
          setIsInitializing(false);
          isConnectingRef.current = false;
          newPusher.disconnect();
        }
      }, CONNECTION_TIMEOUT);

    } catch (error) {
      console.error('❌ Error initializing Pusher:', error);
      setConnectionError(error instanceof Error ? error.message : 'Initialization failed');
      setIsInitializing(false);
      isConnectingRef.current = false;
    }
  }, [getPusherConfig, pusher?.connection.state, startHeartbeat]);

  // Disconnect and cleanup with enhanced error handling
  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting from Pusher...');

    // Clear timeouts
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    // Unsubscribe from channels with validation
    if (pusher) {
      try {
        if (lobbyChannel.current) {
          unsubscribeFromChannel(pusher, 'lobby');
          lobbyChannel.current = null;
        }
        if (gameChannel.current && currentGame?.id) {
          const channelName = CHANNELS.GAME(currentGame.id);
          unsubscribeFromChannel(pusher, channelName);
          gameChannel.current = null;
        }
        if (userChannel.current) {
          const channelName = userChannel.current.name;
          if (channelName) {
            unsubscribeFromChannel(pusher, channelName);
            userChannel.current = null;
          }
        }
        pusher.disconnect();
      } catch (error) {
        console.error('Error disconnecting from Pusher:', error);
      }
    }

    // Clear channel cache
    clearChannelCache();

    // Reset state
    setPusher(null);
    setIsConnected(false);
    setIsInitializing(false);
    setConnectionError(null);
    setReconnectAttempts(0);
    setGames([]);
    setCurrentGame(null);
    setChatMessages([]);
    setPlayerStats(null);

    // Clear refs
    isConnectingRef.current = false;
  }, [pusher, currentGame?.id]);

  // Subscribe to lobby with rate limiting
  const subscribeToLobby = useCallback(() => {
    if (!pusher || !isConnected) {
      console.log('❌ Cannot subscribe to lobby - not connected');
      return;
    }

    if (!checkRateLimit('lobby_subscribe', 5, 60000)) {
      console.log('⚠️ Rate limit exceeded for lobby subscription');
      return;
    }

    try {
      console.log('🔌 Subscribing to lobby...');
      const channel = subscribeToChannel(pusher, 'lobby');

      channel.bind('games-updated', (data: { games: Game[] }) => {
        console.log('📡 Lobby games updated:', data.games);
        setGames(data.games);
      });

      channel.bind('game-created', (data: { game: Game }) => {
        console.log('📡 New game created:', data.game);
        setGames(prev => [...prev, data.game]);
      });

      channel.bind('game-removed', (data: { gameId: string }) => {
        console.log('📡 Game removed:', data.gameId);
        setGames(prev => prev.filter(game => game.id !== data.gameId));
      });

      channel.bind('game-updated', (data: { game: Game }) => {
        console.log('📡 Game updated:', data.game);
        setGames(prev => prev.map(game => game.id === data.game.id ? data.game : game));
      });

      lobbyChannel.current = channel;
    } catch (error) {
      console.error('❌ Error subscribing to lobby:', error);
    }
  }, [pusher, isConnected]);

  // Subscribe to user stats with rate limiting
  const subscribeToUser = useCallback((userName: string) => {
    if (!pusher || !isConnected || !userName) {
      console.log('❌ Cannot subscribe to user - not connected or invalid user');
      return;
    }

    if (!checkRateLimit('user_subscribe', 3, 60000)) {
      console.log('⚠️ Rate limit exceeded for user subscription');
      return;
    }

    try {
      console.log('🔌 Subscribing to user stats:', userName);
      const channelName = CHANNELS.USER(userName);
      const channel = subscribeToChannel(pusher, channelName);

      channel.bind('stats-updated', (data: PlayerStats) => {
        console.log('📊 User stats updated:', data);
        setPlayerStats(data);
      });

      userChannel.current = channel;
    } catch (error) {
      console.error('❌ Error subscribing to user channel:', error);
    }
  }, [pusher, isConnected]);

  // Join game with rate limiting
  const joinGame = useCallback(async (gameId: string, userName: string) => {
    if (!pusher || !isConnected) {
      console.log('❌ Cannot join game - not connected');
      return;
    }

    if (!checkRateLimit('game_join', 5, 60000)) {
      console.log('⚠️ Rate limit exceeded for game join');
      throw new Error('Rate limit exceeded. Please wait before trying again.');
    }

    try {
      console.log('🎮 Joining game:', gameId);
      const response = await fetch('/api/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, userName }),
      });

      if (!response.ok) {
        throw new Error('Failed to join game');
      }

      const data = await response.json();
      setCurrentGame(data.game);

      // Subscribe to game channel
      const channelName = CHANNELS.GAME(gameId);
      const channel = subscribeToChannel(pusher, channelName);

      channel.bind('game-updated', (data: { game: Game }) => {
        console.log('📡 Game updated:', data.game);
        setCurrentGame(data.game);
      });

      channel.bind('chat-message', (data: ChatMessage) => {
        console.log('📡 Chat message received:', data);
        setChatMessages(prev => [...prev, data]);
      });

      channel.bind('game-ended', (data: { winner: string | null }) => {
        console.log('📡 Game ended:', data);
        setCurrentGame(prev => prev ? { ...prev, status: 'finished', winner: data.winner } : null);
      });

      gameChannel.current = channel;
      console.log('✅ Successfully joined game');
    } catch (error) {
      console.error('❌ Error joining game:', error);
      throw error;
    }
  }, [pusher, isConnected]);

  // Leave game with cleanup
  const leaveGame = useCallback(() => {
    if (gameChannel.current && pusher && currentGame?.id) {
      try {
        console.log('🔌 Leaving game channel:', currentGame.id);
        const channelName = CHANNELS.GAME(currentGame.id);
        unsubscribeFromChannel(pusher, channelName);
        gameChannel.current = null;
      } catch (error) {
        console.error('Error disconnecting from Pusher:', error);
      }
    }
    setCurrentGame(null);
    setChatMessages([]);
  }, [pusher, currentGame?.id]);

  // Clear games (debounced)
  const clearGames = useCallback(() => {
    debouncedCleanup();
  }, [debouncedCleanup]);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Auto-subscribe to lobby when connected
  useEffect(() => {
    if (isConnected && pusher) {
      subscribeToLobby();
    }
  }, [isConnected, pusher, subscribeToLobby]);

  return {
    pusher,
    isConnected,
    isInitializing,
    connectionError,
    reconnectAttempts,
    connect,
    disconnect,
    joinGame,
    leaveGame,
    subscribeToLobby,
    subscribeToUser,
    games,
    currentGame,
    chatMessages,
    playerStats,
    clearGames,
  };
}

// Hook for subscribing to game events
export function useGameChannel(gameId: string) {
  const [channel, setChannel] = useState<Channel | null>(null);
  const { isConnected, pusher } = usePusher();

  useEffect(() => {
    if (!isConnected || !gameId || !pusher) return;

    const gameChannel = pusher.subscribe(CHANNELS.GAME(gameId));
    setChannel(gameChannel);

    return () => {
      pusher.unsubscribe(CHANNELS.GAME(gameId));
      setChannel(null);
    };
  }, [isConnected, gameId, pusher]);

  return channel;
}

// Hook for subscribing to user events
export function useUserChannel(userId: string) {
  const [channel, setChannel] = useState<Channel | null>(null);
  const { isConnected, pusher } = usePusher();

  useEffect(() => {
    if (!isConnected || !userId || !pusher) return;

    const userChannel = pusher.subscribe(CHANNELS.USER(userId));
    setChannel(userChannel);

    return () => {
      pusher.unsubscribe(CHANNELS.USER(userId));
      setChannel(null);
    };
  }, [isConnected, userId, pusher]);

  return channel;
} 