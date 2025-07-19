'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { initializePusherClient, getPusherClient, CHANNELS, EVENTS, type Game, type Player, type ChatMessage, type PlayerStats } from '@/lib/pusher';
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

  // Connect to Pusher
  const connect = useCallback(async () => {
    try {
      console.log('Attempting to connect to Pusher...');
      
      // Initialize Pusher client
      const pusherClient = await initializePusherClient();
      pusherClientRef.current = pusherClient;
      
      console.log('Pusher client state:', pusherClient.connection.state);
      
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
      });

      pusherClient.connection.bind('disconnected', () => {
        console.log('Pusher disconnected');
        setIsConnected(false);
      });

      pusherClient.connection.bind('error', (error: any) => {
        console.error('Pusher connection error:', error);
        console.error('Error details:', {
          code: error.code,
          data: error.data,
          message: error.message
        });
        setLastError(error.message || 'Connection error');
        setIsConnected(false);
        setIsInitializing(false);
      });

      // Lobby event handlers
      lobbyChannel.current.bind(EVENTS.GAME_CREATED, (data: { game: Game }) => {
        console.log('Game created:', data.game);
        setGames(prev => [...prev, data.game]);
      });

      lobbyChannel.current.bind(EVENTS.GAME_UPDATED, (data: { game: Game }) => {
        console.log('Game updated:', data.game);
        setGames(prev => prev.map(g => g.id === data.game.id ? data.game : g));
        if (currentGame?.id === data.game.id) {
          setCurrentGame(data.game);
        }
      });

      lobbyChannel.current.bind(EVENTS.GAME_DELETED, (data: { gameId: string }) => {
        console.log('Game deleted:', data.gameId);
        setGames(prev => prev.filter(g => g.id !== data.gameId));
        if (currentGame?.id === data.gameId) {
          setCurrentGame(null);
        }
      });

      lobbyChannel.current.bind(EVENTS.ERROR, (data: { message: string }) => {
        console.error('Pusher error:', data.message);
        setLastError(data.message);
      });

    } catch (error) {
      console.error('Error connecting to Pusher:', error);
      setLastError(error instanceof Error ? error.message : 'Connection failed');
      setIsInitializing(false);
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
        gameChannel.current.bind(EVENTS.GAME_UPDATED, (data: { game: Game }) => {
          console.log('Game updated in channel:', data.game);
          setCurrentGame(data.game);
          setGames(prev => prev.map(g => g.id === data.game.id ? data.game : g));
        });

        gameChannel.current.bind(EVENTS.PLAYER_JOINED, (data: { player: string, game: Game }) => {
          console.log('Player joined:', data.player);
          setCurrentGame(data.game);
          setGames(prev => prev.map(g => g.id === data.game.id ? data.game : g));
        });

        gameChannel.current.bind(EVENTS.PLAYER_LEFT, (data: { player: string, game: Game }) => {
          console.log('Player left:', data.player);
          setCurrentGame(data.game);
          setGames(prev => prev.map(g => g.id === data.game.id ? data.game : g));
        });

        gameChannel.current.bind(EVENTS.PLAYER_MOVED, (data: { game: Game }) => {
          console.log('Player moved:', data.game);
          setCurrentGame(data.game);
          setGames(prev => prev.map(g => g.id === data.game.id ? data.game : g));
        });

        gameChannel.current.bind(EVENTS.GAME_ENDED, (data: { game: Game, winner: string | null }) => {
          console.log('Game ended:', data.game, 'Winner:', data.winner);
          setCurrentGame(data.game);
          setGames(prev => prev.map(g => g.id === data.game.id ? data.game : g));
        });

        gameChannel.current.bind(EVENTS.CHAT_MESSAGE, (data: { message: ChatMessage }) => {
          console.log('Chat message received:', data.message);
          setChatMessages(prev => [...prev, data.message]);
        });

        gameChannel.current.bind(EVENTS.STATS_UPDATED, (data: { stats: PlayerStats }) => {
          console.log('Stats updated:', data.stats);
          setPlayerStats(data.stats);
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
        userChannel.current.bind(EVENTS.STATS_UPDATED, (data: { stats: PlayerStats }) => {
          console.log('User stats updated:', data.stats);
          setPlayerStats(data.stats);
        });
      }

    } catch (error) {
      console.error('Error subscribing to user channel:', error);
    }
  }, []);

  // Initialize connection on mount
  useEffect(() => {
    connect();
    
    // Fallback: Load games from API if Pusher fails
    const loadGamesFromAPI = async () => {
      try {
        const response = await fetch('/api/game/list');
        if (response.ok) {
          const gamesData = await response.json();
          setGames(gamesData);
        }
      } catch (error) {
        console.error('Failed to load games from API:', error);
      }
    };

    // Try to load games after a delay if not connected
    const timeout = setTimeout(() => {
      if (!isConnected && !isInitializing) {
        console.log('Pusher not connected, loading games from API...');
        loadGamesFromAPI();
      }
    }, 5000);

    return () => {
      clearTimeout(timeout);
      disconnect();
    };
  }, [connect, disconnect, isConnected, isInitializing]);

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