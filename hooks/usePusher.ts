'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { initializePusherClient, getPusherClient, CHANNELS, EVENTS, type Game, type Player, type ChatMessage, type PlayerStats } from '@/lib/pusher-client';
import type { Channel } from 'pusher-js';

export function usePusher() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const lobbyChannel = useRef<Channel | null>(null);
  const gameChannel = useRef<Channel | null>(null);
  const userChannel = useRef<Channel | null>(null);
  const pusherClientRef = useRef<any>(null);
  const connectionAttemptRef = useRef<boolean>(false);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to Pusher
  const connect = useCallback(async () => {
    // Prevent multiple connection attempts
    if (connectionAttemptRef.current) {
      console.log('Connection attempt already in progress, skipping...');
      return;
    }
    
    connectionAttemptRef.current = true;
    
    try {
      console.log('Attempting to connect to Pusher...');
      
      // Initialize Pusher client
      const pusherClient = await initializePusherClient();
      pusherClientRef.current = pusherClient;
      
      console.log('Pusher client state:', pusherClient.connection.state);
      
      // Check if already connected
      if (pusherClient.connection.state === 'connected') {
        console.log('Pusher already connected');
        setIsConnected(true);
        setLastError(null);
        setIsInitializing(false);
        connectionAttemptRef.current = false;
        return;
      }
      
      // Subscribe to lobby channel
      lobbyChannel.current = pusherClient.subscribe(CHANNELS.LOBBY);
      
      // Connection event handlers
      pusherClient.connection.bind('connecting', () => {
        console.log('Pusher connecting...');
      });

      pusherClient.connection.bind('connected', () => {
        console.log('Pusher connected successfully');
        setIsConnected(true);
        setLastError(null);
        setIsInitializing(false);
        
        // Clear connection attempt flag
        connectionAttemptRef.current = false;
        
        // Clear any existing timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
      });

      pusherClient.connection.bind('disconnected', () => {
        console.log('Pusher disconnected');
        setIsConnected(false);
      });

      pusherClient.connection.bind('error', (error: unknown) => {
        console.error('Pusher connection error:', error);
        
        // Safely extract error details
        const errorDetails = {
          code: error && typeof error === 'object' && 'code' in error ? (error as any).code : undefined,
          data: error && typeof error === 'object' && 'data' in error ? (error as any).data : undefined,
          message: error && typeof error === 'object' && 'message' in error ? (error as any).message : undefined
        };
        
        console.error('Error details:', errorDetails);
        setLastError(errorDetails.message || 'Connection error');
        setIsConnected(false);
        setIsInitializing(false);
        
        // Clear connection attempt flag
        connectionAttemptRef.current = false;
      });

      // Set a timeout for connection
      connectionTimeoutRef.current = setTimeout(() => {
        if (!isConnected) {
          console.log('Pusher connection timeout');
        }
        connectionAttemptRef.current = false;
      }, 5000); // Increased timeout to 5 seconds

      // Clean up timeout when connected
      pusherClient.connection.bind('connected', () => {
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
      });

      // Clean up timeout when error occurs
      pusherClient.connection.bind('error', (error: unknown) => {
        console.log('Cleaning up timeout due to error');
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
      });

      // Lobby event handlers
      lobbyChannel.current.bind(EVENTS.GAME_CREATED, (data: unknown) => {
        try {
          const gameData = data as { game: Game };
          console.log('Game created:', gameData.game);
          setGames(prev => [...prev, gameData.game]);
        } catch (error) {
          console.error('Error handling game created event:', error);
        }
      });

      lobbyChannel.current.bind(EVENTS.GAME_UPDATED, (data: unknown) => {
        try {
          const gameData = data as { game: Game };
          console.log('Game updated:', gameData.game);
          setGames(prev => prev.map(g => g.id === gameData.game.id ? gameData.game : g));
          if (currentGame?.id === gameData.game.id) {
            setCurrentGame(gameData.game);
          }
        } catch (error) {
          console.error('Error handling game updated event:', error);
        }
      });

      lobbyChannel.current.bind(EVENTS.GAME_DELETED, (data: unknown) => {
        try {
          const gameData = data as { gameId: string };
          console.log('Game deleted:', gameData.gameId);
          setGames(prev => prev.filter(g => g.id !== gameData.gameId));
          if (currentGame?.id === gameData.gameId) {
            setCurrentGame(null);
          }
        } catch (error) {
          console.error('Error handling game deleted event:', error);
        }
      });

      lobbyChannel.current.bind(EVENTS.ERROR, (data: unknown) => {
        try {
          const errorData = data as { message: string };
          console.error('Pusher error:', errorData.message);
          setLastError(errorData.message);
        } catch (error) {
          console.error('Error handling Pusher error event:', error);
          setLastError('Unknown Pusher error');
        }
      });

    } catch (error) {
      console.error('Error connecting to Pusher:', error);
      setLastError(error instanceof Error ? error.message : 'Connection failed');
      setIsInitializing(false);
      
      // Clear connection attempt flag
      connectionAttemptRef.current = false;
    }
  }, [currentGame]);

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

  return {
    isConnected,
    isInitializing,
    lastError,
    games,
    currentGame,
    chatMessages,
    playerStats,
    connect,
    disconnect,
    reconnect: () => {
      console.log('Manual reconnect triggered');
      connectionAttemptRef.current = false;
      connect();
    },
    joinGame,
    leaveGame,
    subscribeToUser,
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