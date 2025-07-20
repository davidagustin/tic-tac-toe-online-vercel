'use client';

import { CHANNELS, EVENTS, type ChatMessage, type Game, type PlayerStats } from '@/lib/pusher-client';
import type { Channel } from 'pusher-js';
import Pusher from 'pusher-js';
import { useCallback, useEffect, useRef, useState } from 'react';

const CONNECTION_TIMEOUT = 15000; // Keep 15 seconds
const RECONNECT_DELAY = 15000; // Reduced from 30 to 15 seconds for initial connections
const MAX_RECONNECT_ATTEMPTS = 3; // Increased back to 3 for better reliability
const POLLING_INTERVAL = 120000; // Keep 2 minutes for polling
const EXPONENTIAL_BACKOFF_BASE = 5000; // Reduced from 10 to 5 seconds for faster initial retry
const CONFIG_CACHE_TIME = 300000; // Keep 5 minutes cache
const API_DEBOUNCE_TIME = 2000; // Reduced from 5 to 2 seconds for initial connections

export function usePusher() {
  const [pusher, setPusher] = useState<Pusher | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastReconnectTime, setLastReconnectTime] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);

  const lobbyChannel = useRef<Channel | null>(null);
  const gameChannel = useRef<Channel | null>(null);
  const userChannel = useRef<Channel | null>(null);
  const pusherClientRef = useRef<any>(null);
  const connectionAttemptRef = useRef<boolean>(false);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastApiCallRef = useRef<number>(0);
  const apiCallDebounceMs = API_DEBOUNCE_TIME;
  const configCacheRef = useRef<{ config: any; timestamp: number } | null>(null);
  const configCacheTimeout = CONFIG_CACHE_TIME;
  const connectionPoolRef = useRef<Set<string>>(new Set());

  // Intelligent exponential backoff
  const getReconnectDelay = useCallback((attempt: number) => {
    // Exponential backoff with jitter: base * (2^attempt) + random jitter
    const baseDelay = EXPONENTIAL_BACKOFF_BASE * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 5000; // Add up to 5 seconds of jitter
    const maxDelay = 300000; // Cap at 5 minutes
    return Math.min(baseDelay + jitter, maxDelay);
  }, []);

  // Connection pool management to prevent multiple connections
  const acquireConnection = useCallback((connectionId: string) => {
    if (connectionPoolRef.current.has(connectionId)) {
      console.log('Connection already in pool, skipping...');
      return false;
    }
    connectionPoolRef.current.add(connectionId);
    return true;
  }, []);

  const releaseConnection = useCallback((connectionId: string) => {
    connectionPoolRef.current.delete(connectionId);
  }, []);

  // Debounced API call to prevent rate limiting
  const debouncedApiCall = useCallback(async (apiFunction: () => Promise<any>) => {
    const now = Date.now();
    if (now - lastApiCallRef.current < apiCallDebounceMs) {
      console.log('API call debounced, waiting...');
      return null;
    }

    lastApiCallRef.current = now;
    return apiFunction();
  }, []);

  // Debounced connection to prevent race conditions
  const connect = useCallback(async () => {
    const connectionId = Date.now().toString();
    const now = Date.now();

    // Connection pooling - prevent multiple simultaneous connections
    if (!acquireConnection(connectionId)) {
      return;
    }

    // Prevent multiple simultaneous connections
    if (isConnecting || pusher?.connection.state === 'connected') {
      console.log('Connection already in progress or connected');
      releaseConnection(connectionId);
      return;
    }

    // For initial connections, be less strict about rate limiting
    const isInitialConnection = reconnectAttempts === 0;
    const effectiveReconnectDelay = isInitialConnection ? 5000 : RECONNECT_DELAY;

    // Rate limit reconnection attempts but be lenient on first try
    if (!isInitialConnection && now - lastReconnectTime < effectiveReconnectDelay) {
      console.log(`Reconnection rate limited, waiting ${effectiveReconnectDelay - (now - lastReconnectTime)}ms...`);
      releaseConnection(connectionId);
      return;
    }

    // Check max reconnect attempts
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log('Max reconnection attempts reached, switching to fallback mode');
      setIsFallbackMode(true);
      setIsInitializing(false);
      releaseConnection(connectionId);
      return;
    }

    setIsConnecting(true);
    setLastReconnectTime(now);

    try {
      console.log(`Attempting to connect to Pusher... (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);

      // Check cache first with longer cache time
      if (configCacheRef.current && (now - configCacheRef.current.timestamp) < configCacheTimeout) {
        console.log('Using cached Pusher config');
        const config = configCacheRef.current.config;

        if (!config.key || !config.cluster) {
          throw new Error('Invalid cached Pusher configuration');
        }

        // Create new Pusher instance with optimized config
        const newPusher = new Pusher(config.key, {
          cluster: config.cluster,
          forceTLS: true,
          enabledTransports: ['ws', 'wss'], // Prioritize WebSocket transports
          disabledTransports: ['xhr_polling'], // Disable polling transports to reduce load
          enableStats: false, // Disable stats to reduce traffic
        });

        // Set up connection event handlers with intelligent retry
        newPusher.connection.bind('connecting', () => {
          console.log('Pusher connecting...');
        });

        newPusher.connection.bind('connected', () => {
          console.log('Pusher connected successfully');
          setIsConnected(true);
          setIsInitializing(false);
          setConnectionError(null);
          setIsFallbackMode(false);
          setReconnectAttempts(0);
          setIsConnecting(false);
          releaseConnection(connectionId);
        });

        newPusher.connection.bind('disconnected', () => {
          console.log('Pusher disconnected');
          setIsConnected(false);
          setIsConnecting(false);
          releaseConnection(connectionId);
        });

        newPusher.connection.bind('error', (error: any) => {
          console.log('Pusher connection error:', error);
          setConnectionError(error.message || 'Connection failed');
          setIsConnecting(false);
          releaseConnection(connectionId);

          // Increment reconnect attempts
          setReconnectAttempts(prev => prev + 1);

          // Use faster retry for initial connections
          const delay = isInitialConnection ? 3000 : getReconnectDelay(reconnectAttempts + 1);
          console.log(`Scheduling reconnection in ${Math.round(delay / 1000)}s (attempt ${reconnectAttempts + 1})`);

          setTimeout(() => {
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
              connect();
            } else {
              console.log('Max attempts reached, switching to fallback mode');
              setIsFallbackMode(true);
              setIsInitializing(false);
            }
          }, delay);
        });

        setPusher(newPusher);
        pusherClientRef.current = newPusher;
        return;
      }

      // API call debouncing - be lenient for initial connections
      const effectiveDebounceTime = isInitialConnection ? 1000 : apiCallDebounceMs;
      if (!isInitialConnection && now - lastApiCallRef.current < effectiveDebounceTime) {
        console.log('API call debounced, using fallback mode');
        setIsFallbackMode(true);
        setIsInitializing(false);
        setIsConnecting(false);
        releaseConnection(connectionId);
        return;
      }

      lastApiCallRef.current = now;

      // Get fresh config with longer timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased timeout

      const response = await fetch('/api/pusher-config', {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'max-age=300', // Cache for 5 minutes
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to get Pusher config');
      }

      const config = await response.json();

      // Cache the config for longer
      configCacheRef.current = {
        config,
        timestamp: now
      };

      if (!config.key || !config.cluster) {
        throw new Error('Invalid Pusher configuration');
      }

      // Create new Pusher instance with optimized settings
      const newPusher = new Pusher(config.key, {
        cluster: config.cluster,
        forceTLS: true,
        enabledTransports: ['ws', 'wss'], // WebSocket only
        disabledTransports: ['xhr_polling', 'xhr_streaming'], // Disable all polling
        enableStats: false,
        pongTimeout: 30000, // Increase pong timeout
        unavailableTimeout: 60000, // Increase unavailable timeout
      });

      // Set up connection event handlers
      newPusher.connection.bind('connecting', () => {
        console.log('Pusher connecting...');
      });

      newPusher.connection.bind('connected', () => {
        console.log('Pusher connected successfully');
        setIsConnected(true);
        setIsInitializing(false);
        setConnectionError(null);
        setIsFallbackMode(false);
        setReconnectAttempts(0);
        setIsConnecting(false);
        releaseConnection(connectionId);
      });

      newPusher.connection.bind('disconnected', () => {
        console.log('Pusher disconnected');
        setIsConnected(false);
        setIsConnecting(false);
        releaseConnection(connectionId);
      });

      newPusher.connection.bind('error', (error: any) => {
        console.log('Pusher connection error:', error);
        setConnectionError(error.message || 'Connection failed');
        setIsConnecting(false);
        releaseConnection(connectionId);

        // Increment reconnect attempts
        setReconnectAttempts(prev => prev + 1);

        // Use faster retry for initial connections
        const delay = isInitialConnection ? 3000 : getReconnectDelay(reconnectAttempts + 1);
        console.log(`Scheduling reconnection in ${Math.round(delay / 1000)}s (attempt ${reconnectAttempts + 1})`);

        setTimeout(() => {
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            connect();
          } else {
            console.log('Max attempts reached, switching to fallback mode');
            setIsFallbackMode(true);
            setIsInitializing(false);
          }
        }, delay);
      });

      setPusher(newPusher);
      pusherClientRef.current = newPusher;

    } catch (error) {
      console.error('Failed to initialize Pusher:', error);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
      setIsConnecting(false);

      // For initial connection failures, try fallback mode sooner
      if (isInitialConnection) {
        console.log('Initial connection failed, enabling fallback mode');
        setIsFallbackMode(true);
      }
      setIsInitializing(false);
      releaseConnection(connectionId);
    }
  }, [isConnecting, pusher, lastReconnectTime, reconnectAttempts, getReconnectDelay, acquireConnection, releaseConnection]);

  // Manual reconnect function
  const manualReconnect = useCallback(() => {
    if (pusher) {
      console.log('Manually disconnecting existing Pusher instance...');
      pusher.disconnect();
    }

    // Reset state
    setReconnectAttempts(0);
    setConnectionError(null);
    setIsFallbackMode(false);

    // Wait a bit before reconnecting
    setTimeout(() => {
      connect();
    }, 1000);
  }, [pusher, connect]);

  // Clear games state (useful for logout cleanup)
  const clearGames = useCallback(() => {
    console.log('🧹 Clearing games state from Pusher hook');
    setGames([]);
  }, []);

  // Handle page unload to clean up user from games
  useEffect(() => {
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      console.log('🔄 Page unloading, cleaning up user...');

      // Get current user from localStorage or session
      const currentUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || localStorage.getItem('ticTacToeUser');

      if (currentUser) {
        try {
          const userData = JSON.parse(currentUser);
          console.log(`🧹 Cleaning up user ${userData.username} on page unload`);

          // Send cleanup request to server
          await fetch('/api/clear-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: userData.username,
              action: 'signout'
            }),
            // Use keepalive to ensure request completes
            keepalive: true
          });

          // Clear games state immediately
          clearGames();
        } catch (error) {
          console.error('Error cleaning up user on page unload:', error);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log('🔄 Page hidden, cleaning up user...');
        handleBeforeUnload(new Event('beforeunload') as BeforeUnloadEvent);
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [clearGames]);

  // Periodic cleanup of inactive users and old games
  useEffect(() => {
    const cleanupInterval = setInterval(async () => {
      try {
        console.log('🧹 Running periodic cleanup...');
        await fetch('/api/cleanup-periodic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error during periodic cleanup:', error);
      }
    }, 5 * 60 * 1000); // Run every 5 minutes

    return () => clearInterval(cleanupInterval);
  }, []);

  // Disconnect from Pusher
  const disconnect = useCallback(() => {
    try {
      const pusherClient = pusherClientRef.current;
      if (!pusherClient) return;

      if (lobbyChannel.current) {
        pusherClient.unsubscribe(CHANNELS.LOBBY);
        lobbyChannel.current = null;
      }
      if (gameChannel.current) {
        pusherClient.unsubscribe(CHANNELS.GAME(currentGame?.id || ''));
        gameChannel.current = null;
      }
      if (userChannel.current) {
        pusherClient.unsubscribe(CHANNELS.USER(currentGame?.id || ''));
        userChannel.current = null;
      }
      pusherClient.disconnect();
      pusherClientRef.current = null;
      setIsConnected(false);

      // Clear connection attempt flag and timeouts
      connectionAttemptRef.current = false;
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    } catch (error) {
      console.error('Error disconnecting from Pusher:', error);
    }
  }, [currentGame?.id]);

  // Join a game channel
  const joinGame = useCallback(async (gameId: string, userName: string) => {
    console.log('🔌 usePusher: joinGame called with gameId:', gameId, 'userName:', userName);

    try {
      const pusherClient = pusherClientRef.current;
      console.log('🔌 usePusher: pusherClient available:', !!pusherClient);

      if (!pusherClient) {
        console.error('❌ usePusher: Pusher client not initialized');
        return;
      }

      // Unsubscribe from previous game channel
      if (gameChannel.current) {
        console.log('🔌 usePusher: Unsubscribing from previous game channel');
        pusherClient.unsubscribe(CHANNELS.GAME(currentGame?.id || ''));
        gameChannel.current = null;
      }

      // Subscribe to new game channel
      console.log('🔌 usePusher: Subscribing to game channel:', CHANNELS.GAME(gameId));
      gameChannel.current = pusherClient.subscribe(CHANNELS.GAME(gameId));
      console.log('✅ usePusher: Successfully subscribed to game channel');

      // Immediately fetch current game data
      console.log('🔌 usePusher: Fetching current game data from API...');
      try {
        const response = await fetch(`/api/games/${gameId}`);
        console.log('🔌 usePusher: Game data API response status:', response.status);

        if (response.ok) {
          const gameData = await response.json();
          console.log('✅ usePusher: Fetched current game data:', gameData);
          console.log('✅ usePusher: Game players:', gameData.players);
          console.log('✅ usePusher: Game status:', gameData.status);
          console.log('✅ usePusher: Game currentPlayer:', gameData.currentPlayer);
          console.log('✅ usePusher: Game board:', gameData.board);
          setCurrentGame(gameData);
        } else {
          console.error('❌ usePusher: Failed to fetch game data:', response.status);
          const errorText = await response.text();
          console.error('❌ usePusher: Error response:', errorText);
        }
      } catch (error) {
        console.error('❌ usePusher: Error fetching game data:', error);
      }

      // Game-specific event handlers
      if (gameChannel.current) {
        gameChannel.current.bind(EVENTS.GAME_UPDATED, (data: unknown) => {
          try {
            const gameData = data as { game: Game };
            console.log('Game updated in channel:', gameData.game);
            setCurrentGame(gameData.game);
            setGames(prev => prev.map(g => g.id === gameData.game.id ? gameData.game : g));
          } catch (error) {
            console.error('Error handling game updated event:', error);
          }
        });

        gameChannel.current.bind(EVENTS.PLAYER_JOINED, (data: unknown) => {
          try {
            const playerData = data as { player: string, game: Game };
            console.log('Player joined:', playerData.player);
            setCurrentGame(playerData.game);
            setGames(prev => prev.map(g => g.id === playerData.game.id ? playerData.game : g));
          } catch (error) {
            console.error('Error handling player joined event:', error);
          }
        });

        gameChannel.current.bind(EVENTS.PLAYER_LEFT, (data: unknown) => {
          try {
            const playerData = data as { player: string, game: Game };
            console.log('Player left:', playerData.player);
            setCurrentGame(playerData.game);
            setGames(prev => prev.map(g => g.id === playerData.game.id ? playerData.game : g));
          } catch (error) {
            console.error('Error handling player left event:', error);
          }
        });

        gameChannel.current.bind(EVENTS.PLAYER_MOVED, (data: unknown) => {
          try {
            const gameData = data as { game: Game };
            console.log('Player moved:', gameData.game);
            setCurrentGame(gameData.game);
            setGames(prev => prev.map(g => g.id === gameData.game.id ? gameData.game : g));
          } catch (error) {
            console.error('Error handling player moved event:', error);
          }
        });

        gameChannel.current.bind(EVENTS.GAME_ENDED, (data: unknown) => {
          try {
            const gameData = data as { game: Game, winner: string | null };
            console.log('Game ended:', gameData.game, 'Winner:', gameData.winner);
            setCurrentGame(gameData.game);
            setGames(prev => prev.map(g => g.id === gameData.game.id ? gameData.game : g));
          } catch (error) {
            console.error('Error handling game ended event:', error);
          }
        });

        gameChannel.current.bind(EVENTS.CHAT_MESSAGE, (data: unknown) => {
          try {
            const messageData = data as { message: ChatMessage };
            console.log('Chat message received:', messageData.message);
            setChatMessages(prev => [...prev, messageData.message]);
          } catch (error) {
            console.error('Error handling chat message event:', error);
          }
        });

        gameChannel.current.bind(EVENTS.STATS_UPDATED, (data: unknown) => {
          try {
            const statsData = data as { stats: PlayerStats };
            console.log('Stats updated:', statsData.stats);
            setPlayerStats(statsData.stats);
          } catch (error) {
            console.error('Error handling stats updated event:', error);
          }
        });
      }

    } catch (error) {
      console.error('Error joining game channel:', error);
      setLastError(error instanceof Error ? error.message : 'Failed to join game');
    }
  }, [currentGame?.id]);

  // Leave game channel
  const leaveGame = useCallback(() => {
    try {
      const pusherClient = pusherClientRef.current;
      if (!pusherClient) return;

      if (gameChannel.current) {
        pusherClient.unsubscribe(CHANNELS.GAME(currentGame?.id || ''));
        gameChannel.current = null;
      }
      setCurrentGame(null);
      setChatMessages([]);
    } catch (error) {
      console.error('Error leaving game channel:', error);
    }
  }, [currentGame?.id]);

  // Subscribe to user-specific channel for stats
  const subscribeToUser = useCallback((userName: string) => {
    if (!pusher || !pusher.connection) {
      console.error('Pusher client not initialized or not connected');
      return;
    }

    // Add a small delay to ensure connection is stable
    setTimeout(() => {
      if (pusher && pusher.connection.state === 'connected') {
        const channel = pusher.subscribe(`user-${userName}`);
        console.log(`Subscribed to user channel: user-${userName}`);
      } else {
        console.error('Pusher not connected, cannot subscribe to user channel');
      }
    }, 100);
  }, [pusher]);

  // Subscribe to lobby channel for game updates
  const subscribeToLobby = useCallback(() => {
    console.log('🔌 usePusher: subscribeToLobby called - pusher:', !!pusher, 'isConnected:', isConnected);
    console.log('🔌 usePusher: Browser:', navigator.userAgent);

    if (!pusher || !isConnected) {
      console.error('❌ usePusher: Pusher not connected, cannot subscribe to lobby');
      console.error('❌ usePusher: pusher state:', pusher?.connection?.state);
      return;
    }

    console.log('🔌 usePusher: Subscribing to lobby channel...');
    const lobbyChannel = pusher.subscribe('lobby');
    console.log('✅ usePusher: Successfully subscribed to lobby channel');

    // Add subscription success callback
    lobbyChannel.bind('pusher:subscription_succeeded', () => {
      console.log('✅ usePusher: Lobby subscription succeeded');
    });

    lobbyChannel.bind('pusher:subscription_error', (error: any) => {
      console.error('❌ usePusher: Lobby subscription error:', error);
    });

    lobbyChannel.bind('game-created', (data: { game: Game }) => {
      console.log('🔌 usePusher: Game created in lobby:', data.game);
      setGames(prev => {
        const existing = prev.find(g => g.id === data.game.id);
        if (existing) {
          return prev.map(g => g.id === data.game.id ? data.game : g);
        } else {
          return [...prev, data.game];
        }
      });
    });

    lobbyChannel.bind('game-updated', (data: { game: Game }) => {
      console.log('🔌 usePusher: Game updated in lobby:', data.game);
      setGames(prev => prev.map(g => g.id === data.game.id ? data.game : g));
    });

    lobbyChannel.bind('game-removed', (data: { gameId: string }) => {
      console.log('🔌 usePusher: Game removed from lobby:', data.gameId);
      setGames(prev => prev.filter(g => g.id !== data.gameId));
    });
  }, [pusher, isConnected]);

  // Initialize connection on mount
  useEffect(() => {
    // Clear games state on initial load to prevent stale data
    console.log('🧹 usePusher: Clearing games state on initial load...');
    setGames([]);

    // Only attempt connection if not already connected and not already attempting
    if (!isConnected && !connectionAttemptRef.current) {
      connect();
    }

    // Check connection status after a delay
    const timeout = setTimeout(() => {
      console.log('Checking connection status after timeout...', { isConnected, isInitializing });
    }, 6000); // Increased timeout to 6 seconds to allow connection to establish

    return () => {
      clearTimeout(timeout);
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      disconnect();
    };
  }, []); // Remove dependencies to prevent multiple calls

  // Subscribe to lobby when connected
  useEffect(() => {
    if (isConnected) {
      console.log('🔌 usePusher: Connection established, subscribing to lobby...');
      subscribeToLobby();
    }
  }, [isConnected, subscribeToLobby]);

  // Much less aggressive polling with exponential backoff
  useEffect(() => {
    // Only enable polling in fallback mode and much less frequently
    if (!isFallbackMode) {
      return;
    }

    let pollInterval: NodeJS.Timeout;
    let pollAttempts = 0;
    const maxPollAttempts = 5; // Limit polling attempts

    if (isFallbackMode && !isConnected) {
      console.log('Starting reduced-frequency polling in fallback mode...');

      // Much less frequent polling with exponential backoff
      const doPoll = () => {
        if (pollAttempts >= maxPollAttempts) {
          console.log('Max polling attempts reached, stopping polls');
          return;
        }

        pollAttempts++;
        console.log(`Polling for updates (attempt ${pollAttempts}/${maxPollAttempts})...`);

        // Trigger a re-fetch of data less frequently
        window.dispatchEvent(new CustomEvent('pusher-poll'));

        // Exponential backoff for polling
        const nextPollDelay = POLLING_INTERVAL * Math.pow(1.5, pollAttempts - 1);
        pollInterval = setTimeout(doPoll, Math.min(nextPollDelay, 300000)); // Cap at 5 minutes
      };

      // Start first poll after initial delay
      pollInterval = setTimeout(doPoll, POLLING_INTERVAL);
    }

    return () => {
      if (pollInterval) {
        clearTimeout(pollInterval);
      }
    };
  }, [isFallbackMode, isConnected]);

  return {
    pusher,
    isConnected,
    isInitializing,
    connectionError,
    isFallbackMode,
    reconnectAttempts,
    isConnecting,
    connect: manualReconnect, // Expose manual reconnect
    disconnect,
    joinGame,
    leaveGame,
    subscribeToUser,
    subscribeToLobby,
    chatMessages,
    games,
    currentGame,
    playerStats,
    clearGames, // Expose clearGames function
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