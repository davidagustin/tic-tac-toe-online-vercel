'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { initializePusherClient, getPusherClient, CHANNELS, EVENTS, type Game, type Player, type ChatMessage, type PlayerStats } from '@/lib/pusher-client';
import type { Channel } from 'pusher-js';
import Pusher from 'pusher-js';

const CONNECTION_TIMEOUT = 10000; // 10 seconds
const RECONNECT_DELAY = 10000; // Increased from 5 to 10 seconds minimum
const MAX_RECONNECT_ATTEMPTS = 3; // Reduced from 5 to 3 attempts
const POLLING_INTERVAL = 30000; // Increased from 15 to 30 seconds
const EXPONENTIAL_BACKOFF_BASE = 5000; // Increased from 2 to 5 seconds base

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
  const apiCallDebounceMs = 1000; // 1 second debounce between API calls
  const configCacheRef = useRef<{ config: any; timestamp: number } | null>(null);
  const configCacheTimeout = 5 * 60 * 1000; // 5 minutes cache

  // Exponential backoff calculation
  const getReconnectDelay = useCallback((attempts: number) => {
    const delay = Math.min(
      EXPONENTIAL_BACKOFF_BASE * Math.pow(2, attempts),
      30000 // Max 30 seconds
    );
    return delay;
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
    const now = Date.now();
    
    // Prevent multiple simultaneous connections
    if (isConnecting || pusher?.connection.state === 'connected') {
      console.log('Connection already in progress or connected');
      return;
    }

    // Rate limit reconnection attempts
    if (now - lastReconnectTime < RECONNECT_DELAY) {
      console.log('Reconnection rate limited, waiting...');
      return;
    }

    // Check max reconnect attempts
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log('Max reconnection attempts reached, staying in fallback mode');
      setIsFallbackMode(true);
      return;
    }

    setIsConnecting(true);
    setLastReconnectTime(now);

    try {
      console.log('Attempting to connect to Pusher...');
      
      // Check cache first
      const now = Date.now();
      if (configCacheRef.current && (now - configCacheRef.current.timestamp) < configCacheTimeout) {
        console.log('Using cached Pusher config');
        const config = configCacheRef.current.config;
        
        if (!config.key || !config.cluster) {
          throw new Error('Invalid cached Pusher configuration');
        }
        
        // Create new Pusher instance with cached config
        const newPusher = new Pusher(config.key, {
          cluster: config.cluster,
          forceTLS: true,
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
        });

        newPusher.connection.bind('disconnected', () => {
          console.log('Pusher disconnected');
          setIsConnected(false);
          setIsConnecting(false);
        });

        newPusher.connection.bind('error', (error: any) => {
          console.log('Pusher connection error:', error);
          setConnectionError(error.message || 'Connection failed');
          setIsConnecting(false);
          
          // Increment reconnect attempts
          setReconnectAttempts(prev => prev + 1);
          
          // Schedule reconnection with exponential backoff
          const delay = getReconnectDelay(reconnectAttempts + 1);
          console.log(`Scheduling reconnection in ${delay}ms (attempt ${reconnectAttempts + 1})`);
          
          setTimeout(() => {
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
              connect();
            } else {
              setIsFallbackMode(true);
            }
          }, delay);
        });

        setPusher(newPusher);
        return;
      }
      
      // Get fresh config to avoid stale credentials with debouncing
      const configResponse = await debouncedApiCall(async () => {
        const response = await fetch('/api/pusher-config');
        if (!response.ok) {
          throw new Error('Failed to get Pusher config');
        }
        return response.json();
      });
      
      if (!configResponse) {
        throw new Error('API call debounced');
      }
      
      const config = configResponse;
      
      // Cache the config
      configCacheRef.current = {
        config,
        timestamp: now
      };
      
      if (!config.key || !config.cluster) {
        throw new Error('Invalid Pusher configuration');
      }

      // Create new Pusher instance
      const newPusher = new Pusher(config.key, {
        cluster: config.cluster,
        forceTLS: true,
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
      });

      newPusher.connection.bind('disconnected', () => {
        console.log('Pusher disconnected');
        setIsConnected(false);
        setIsConnecting(false);
      });

      newPusher.connection.bind('error', (error: any) => {
        console.log('Pusher connection error:', error);
        setConnectionError(error.message || 'Connection failed');
        setIsConnecting(false);
        
        // Increment reconnect attempts
        setReconnectAttempts(prev => prev + 1);
        
        // Schedule reconnection with exponential backoff
        const delay = getReconnectDelay(reconnectAttempts + 1);
        console.log(`Scheduling reconnection in ${delay}ms (attempt ${reconnectAttempts + 1})`);
        
        setTimeout(() => {
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            connect();
          } else {
            setIsFallbackMode(true);
          }
        }, delay);
      });

      setPusher(newPusher);
      
    } catch (error) {
      console.error('Failed to initialize Pusher:', error);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
      setIsConnecting(false);
      setIsFallbackMode(true);
    }
  }, [isConnecting, pusher, lastReconnectTime, reconnectAttempts, getReconnectDelay]);

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
  const joinGame = useCallback((gameId: string, userName: string) => {
    try {
      const pusherClient = pusherClientRef.current;
      if (!pusherClient) {
        console.error('Pusher client not initialized');
        return;
      }

      // Unsubscribe from previous game channel
      if (gameChannel.current) {
        pusherClient.unsubscribe(CHANNELS.GAME(currentGame?.id || ''));
        gameChannel.current = null;
      }

      // Subscribe to new game channel
      gameChannel.current = pusherClient.subscribe(CHANNELS.GAME(gameId));

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
    try {
      const pusherClient = pusherClientRef.current;
      if (!pusherClient) {
        console.error('Pusher client not initialized');
        return;
      }

      if (userChannel.current) {
        pusherClient.unsubscribe(CHANNELS.USER(userName));
        userChannel.current = null;
      }

      userChannel.current = pusherClient.subscribe(CHANNELS.USER(userName));

      if (userChannel.current) {
        userChannel.current.bind(EVENTS.STATS_UPDATED, (data: unknown) => {
          try {
            const statsData = data as { stats: PlayerStats };
            console.log('User stats updated:', statsData.stats);
            setPlayerStats(statsData.stats);
          } catch (error) {
            console.error('Error handling user stats updated event:', error);
          }
        });
      }

    } catch (error) {
      console.error('Error subscribing to user channel:', error);
    }
  }, []);



  // Initialize connection on mount
  useEffect(() => {
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

  // Improved polling with rate limiting
  useEffect(() => {
    if (!isConnected && !isFallbackMode) {
      return;
    }

    let pollInterval: NodeJS.Timeout;
    
    if (isFallbackMode) {
      // Reduced polling frequency to avoid rate limits
      pollInterval = setInterval(() => {
        // Only poll if not connected and not currently connecting
        if (!isConnected && !isConnecting) {
          console.log('Polling for updates (fallback mode)...');
          // Trigger a re-fetch of data
          window.dispatchEvent(new CustomEvent('pusher-poll'));
        }
      }, POLLING_INTERVAL);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [isConnected, isFallbackMode, isConnecting]);

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
    chatMessages,
    games,
    currentGame,
    playerStats,
  };
}

// Hook for subscribing to game events
export function useGameChannel(gameId: string) {
  const [channel, setChannel] = useState<Channel | null>(null);
  const { isConnected } = usePusher();

  useEffect(() => {
    if (!isConnected || !gameId) return;

    const pusherClient = getPusherClient();
    if (!pusherClient) return;

    const gameChannel = pusherClient.subscribe(CHANNELS.GAME(gameId));
    setChannel(gameChannel);

    return () => {
      pusherClient.unsubscribe(CHANNELS.GAME(gameId));
      setChannel(null);
    };
  }, [isConnected, gameId]);

  return channel;
}

// Hook for subscribing to user events
export function useUserChannel(userId: string) {
  const [channel, setChannel] = useState<Channel | null>(null);
  const { isConnected } = usePusher();

  useEffect(() => {
    if (!isConnected || !userId) return;

    const pusherClient = getPusherClient();
    if (!pusherClient) return;

    const userChannel = pusherClient.subscribe(CHANNELS.USER(userId));
    setChannel(userChannel);

    return () => {
      pusherClient.unsubscribe(CHANNELS.USER(userId));
      setChannel(null);
    };
  }, [isConnected, userId]);

  return channel;
} 