'use client';

import { CHANNELS, type ChatMessage, type Game, type PlayerStats } from '@/lib/pusher-client';
import type { Channel } from 'pusher-js';
import Pusher from 'pusher-js';
import { useCallback, useEffect, useRef, useState } from 'react';

// Simplified configuration - based on GitHub best practices
const CONNECTION_TIMEOUT = 30000; // 30 seconds - more forgiving
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 5000; // 5 seconds base delay
const CONFIG_CACHE_TIME = 300000; // 5 minutes

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

  const lobbyChannel = useRef<Channel | null>(null);
  const gameChannel = useRef<Channel | null>(null);
  const userChannel = useRef<Channel | null>(null);
  const pusherClientRef = useRef<Pusher | null>(null);
  const configCacheRef = useRef<{ config: any; timestamp: number } | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef<boolean>(false);

  // Simple exponential backoff
  const getReconnectDelay = useCallback((attempt: number) => {
    return RECONNECT_DELAY * Math.pow(2, attempt - 1);
  }, []);

  // Initialize Pusher connection - simplified approach
  const initializePusher = useCallback(async (): Promise<Pusher | null> => {
    if (isConnectingRef.current) {
      console.log('🔄 Connection already in progress, skipping...');
      return null;
    }

    isConnectingRef.current = true;
    setIsInitializing(true);

    try {
      console.log('🔌 Initializing Pusher connection...');

      // Check cache first
      const now = Date.now();
      let config;

      if (configCacheRef.current && (now - configCacheRef.current.timestamp) < CONFIG_CACHE_TIME) {
        config = configCacheRef.current.config;
        console.log('📦 Using cached Pusher config');
      } else {
        console.log('🌐 Fetching fresh Pusher config...');
        const response = await fetch('/api/pusher-config', {
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch config: ${response.status}`);
        }

        config = await response.json();
        configCacheRef.current = { config, timestamp: now };
      }

      if (!config.key || !config.cluster) {
        throw new Error('Invalid Pusher configuration');
      }

      // Create Pusher instance with simple, reliable config
      const newPusher = new Pusher(config.key, {
        cluster: config.cluster,
        forceTLS: true,
        enabledTransports: ['ws', 'wss'], // Only WebSocket transports
        activityTimeout: 30000,
        pongTimeout: 6000,
      });

      // Set up event handlers
      newPusher.connection.bind('connecting', () => {
        console.log('🔄 Pusher connecting...');
      });

      newPusher.connection.bind('connected', () => {
        console.log('✅ Pusher connected successfully');
        setIsConnected(true);
        setIsInitializing(false);
        setConnectionError(null);
        setReconnectAttempts(0);
        isConnectingRef.current = false;
      });

      newPusher.connection.bind('disconnected', () => {
        console.log('❌ Pusher disconnected');
        setIsConnected(false);
        isConnectingRef.current = false;
      });

      newPusher.connection.bind('error', (error: any) => {
        console.error('❌ Pusher connection error:', error);
        setConnectionError(error.message || 'Connection failed');
        isConnectingRef.current = false;

        // Simple reconnection logic
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = getReconnectDelay(reconnectAttempts + 1);
          console.log(`🔄 Scheduling reconnection in ${delay}ms (attempt ${reconnectAttempts + 1})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            initializePusher();
          }, delay);
        } else {
          console.log('❌ Max reconnection attempts reached');
          setIsInitializing(false);
        }
      });

      pusherClientRef.current = newPusher;
      setPusher(newPusher);
      return newPusher;

    } catch (error) {
      console.error('❌ Failed to initialize Pusher:', error);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
      setIsInitializing(false);
      isConnectingRef.current = false;
      return null;
    }
  }, [reconnectAttempts, getReconnectDelay]);

  // Manual reconnect function
  const manualReconnect = useCallback(() => {
    console.log('🔄 Manual reconnect triggered');

    // Clear any existing reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Disconnect existing connection
    if (pusherClientRef.current) {
      pusherClientRef.current.disconnect();
    }

    // Reset state
    setReconnectAttempts(0);
    setConnectionError(null);
    isConnectingRef.current = false;

    // Reconnect
    setTimeout(() => {
      initializePusher();
    }, 1000);
  }, [initializePusher]);

  // Clear games state
  const clearGames = useCallback(() => {
    console.log('🧹 Clearing games state');
    setGames([]);
    setCurrentGame(null);
    setChatMessages([]);
  }, []);

  // Subscribe to lobby
  const subscribeToLobby = useCallback(() => {
    if (!pusher || !isConnected) {
      console.log('❌ Cannot subscribe to lobby - not connected');
      return;
    }

    console.log('🔌 Subscribing to lobby...');
    const channel = pusher.subscribe('lobby');

    channel.bind('game-created', (data: { game: Game }) => {
      console.log('🎮 Game created:', data.game);
      setGames(prev => {
        const existing = prev.find(g => g.id === data.game.id);
        if (existing) {
          return prev.map(g => g.id === data.game.id ? data.game : g);
        }
        return [...prev, data.game];
      });
    });

    channel.bind('game-updated', (data: { game: Game }) => {
      console.log('🎮 Game updated:', data.game);
      setGames(prev => prev.map(g => g.id === data.game.id ? data.game : g));
    });

    channel.bind('game-removed', (data: { gameId: string }) => {
      console.log('🎮 Game removed:', data.gameId);
      setGames(prev => prev.filter(g => g.id !== data.gameId));
    });

    lobbyChannel.current = channel;
  }, [pusher, isConnected]);

  // Subscribe to user stats
  const subscribeToUser = useCallback((userName: string) => {
    if (!pusher || !isConnected || !userName) {
      console.log('❌ Cannot subscribe to user - not connected or invalid user');
      return;
    }

    try {
      console.log('🔌 Subscribing to user stats:', userName);
      const channel = pusher.subscribe(CHANNELS.USER(userName));

      channel.bind('stats-updated', (data: PlayerStats) => {
        console.log('📊 User stats updated:', data);
        setPlayerStats(data);
      });

      userChannel.current = channel;
    } catch (error) {
      console.error('❌ Error subscribing to user channel:', error);
    }
  }, [pusher, isConnected]);

  // Join game
  const joinGame = useCallback(async (gameId: string, userName: string) => {
    console.log('🎮 Joining game:', gameId);

    if (!pusher || !isConnected) {
      console.error('❌ Cannot join game - not connected');
      return;
    }

    try {
      // Unsubscribe from previous game
      if (gameChannel.current) {
        pusher.unsubscribe(CHANNELS.GAME(currentGame?.id || ''));
        gameChannel.current = null;
      }

      // Subscribe to new game
      const channel = pusher.subscribe(CHANNELS.GAME(gameId));
      gameChannel.current = channel;

      // Fetch current game data
      const response = await fetch(`/api/games/${gameId}`);
      if (response.ok) {
        const game = await response.json();
        setCurrentGame(game);
      }

    } catch (error) {
      console.error('❌ Error joining game:', error);
    }
  }, [pusher, isConnected, currentGame?.id]);

  // Leave game
  const leaveGame = useCallback(() => {
    if (gameChannel.current && pusher && currentGame?.id) {
      try {
        console.log('🔌 Leaving game channel:', currentGame.id);
        pusher.unsubscribe(CHANNELS.GAME(currentGame.id));
        gameChannel.current = null;
      } catch (error) {
        console.error('Error disconnecting from Pusher:', error);
      }
    }
    setCurrentGame(null);
  }, [pusher, currentGame?.id]);

  // Disconnect
  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting Pusher...');

    // Clear timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Unsubscribe from channels
    if (pusher) {
      try {
        if (lobbyChannel.current) {
          pusher.unsubscribe('lobby');
        }
        if (gameChannel.current && currentGame?.id) {
          pusher.unsubscribe(CHANNELS.GAME(currentGame.id));
        }
        if (userChannel.current) {
          // Get channel name safely for unsubscription
          const channelName = userChannel.current.name;
          if (channelName) {
            pusher.unsubscribe(channelName);
          }
        }
        pusher.disconnect();
      } catch (error) {
        console.error('Error disconnecting from Pusher:', error);
      }
    }

    // Reset state
    setPusher(null);
    setIsConnected(false);
    setIsInitializing(false);
    pusherClientRef.current = null;
    lobbyChannel.current = null;
    gameChannel.current = null;
    userChannel.current = null;
    isConnectingRef.current = false;
  }, [pusher, currentGame?.id]);

  // Initialize on mount
  useEffect(() => {
    initializePusher();

    return () => {
      disconnect();
    };
  }, []); // Empty dependency array - only run once

  // Subscribe to lobby when connected
  useEffect(() => {
    if (isConnected && !lobbyChannel.current) {
      subscribeToLobby();
    }
  }, [isConnected, subscribeToLobby]);

  return {
    pusher,
    isConnected,
    isInitializing,
    connectionError,
    reconnectAttempts,
    connect: manualReconnect,
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