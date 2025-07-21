'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Game {
  id: string;
  name: string;
  board: (string | null)[];
  currentPlayer: 'X' | 'O';
  players: string[];
  status: 'waiting' | 'playing' | 'finished';
  winner?: string;
  createdAt: string;
  lastMove?: number;
  createdBy?: string;
}

interface ChatMessage {
  id: string;
  gameId: string;
  userName: string;
  message: string;
  timestamp: string;
}

interface UserStats {
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
}

interface GameState {
  isConnected: boolean;
  currentGame: Game | null;
  games: Game[];
  chatMessages: ChatMessage[];
  playerStats: UserStats | null;
  error: string | null;
}

const API_BASE = '/api';

// Rate limiting to prevent excessive API calls
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_DELAY = 200; // Reduced to 200ms between calls for the same endpoint

function isRateLimited(endpoint: string): boolean {
  const lastCall = rateLimitMap.get(endpoint);
  const now = Date.now();
  
  if (lastCall && (now - lastCall) < RATE_LIMIT_DELAY) {
    return true;
  }
  
  rateLimitMap.set(endpoint, now);
  return false;
}

export function useTrpcGame() {
  const [state, setState] = useState<GameState>({
    isConnected: true, // Always connected since we're using HTTP polling
    currentGame: null,
    games: [],
    chatMessages: [],
    playerStats: null,
    error: null
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  const startPolling = useCallback((gameId?: string) => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;
    
    // Set connection state to true when polling starts
    setState(prev => ({ ...prev, isConnected: true }));

    // Initial fetch for current game if we have a gameId but no currentGame
    const initialFetch = async () => {
      try {
        // If we have a currentGame, fetch it immediately
        if (state.currentGame && !isRateLimited(`game-${state.currentGame.id}`)) {
          const gameResponse = await fetch(`${API_BASE}/games/${state.currentGame.id}`);
          if (gameResponse.ok) {
            const game = await gameResponse.json();
            setState(prev => ({ ...prev, currentGame: game }));
          }
        }
        // If we have a gameId but no currentGame, fetch it
        else if (gameId && !state.currentGame && !isRateLimited(`game-${gameId}`)) {
          const gameResponse = await fetch(`${API_BASE}/games/${gameId}`);
          if (gameResponse.ok) {
            const game = await gameResponse.json();
            setState(prev => ({ ...prev, currentGame: game }));
          }
        }
      } catch (error) {
        console.error('Initial fetch error:', error);
      }
    };

    // Do initial fetch
    initialFetch();

    intervalRef.current = setInterval(async () => {
      try {
        // Poll for games - REDUCED FREQUENCY with rate limiting
        // Temporarily disable rate limiting for games list to fix lobby issue
        // if (!isRateLimited('game-list')) {
          const gamesResponse = await fetch(`${API_BASE}/game/list`);
          if (gamesResponse.ok) {
            const games = await gamesResponse.json();
            setState(prev => ({ ...prev, games }));
          }
        // }

        // Poll for current game if we have one - REDUCED FREQUENCY with rate limiting
        if (state.currentGame && !isRateLimited(`game-${state.currentGame.id}`)) {
          const gameResponse = await fetch(`${API_BASE}/games/${state.currentGame.id}`);
          if (gameResponse.ok) {
            const game = await gameResponse.json();
            setState(prev => ({ ...prev, currentGame: game }));
          }

          // Poll for chat messages - REDUCED FREQUENCY with rate limiting
          if (!isRateLimited(`chat-${state.currentGame.id}`)) {
            const chatResponse = await fetch(`${API_BASE}/chat?gameId=${state.currentGame.id}`);
            if (chatResponse.ok) {
              const chatMessages = await chatResponse.json();
              setState(prev => ({ ...prev, chatMessages }));
            }
          }
        }
        // If we have a gameId but no currentGame, try to fetch it
        else if (gameId && !state.currentGame && !isRateLimited(`game-${gameId}`)) {
          const gameResponse = await fetch(`${API_BASE}/games/${gameId}`);
          if (gameResponse.ok) {
            const game = await gameResponse.json();
            setState(prev => ({ ...prev, currentGame: game }));
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        setState(prev => ({ ...prev, error: 'Connection error', isConnected: false }));
      }
    }, 1000); // Reduced to 1 second for faster updates during testing
  }, [state.currentGame?.id]); // Removed gameId from dependencies since it's a parameter

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isPollingRef.current = false;
  }, []);

  const subscribeToLobby = useCallback((gameId?: string) => {
    startPolling(gameId);
  }, [startPolling]);

  const subscribeToUser = useCallback(async (username: string): Promise<void> => {
    console.log('🔍 subscribeToUser called for:', username, 'at:', new Date().toISOString());
    
    // Apply rate limiting to stats API calls
    const endpoint = `stats-${username}`;
    if (isRateLimited(endpoint)) {
      console.log('🚫 Rate limited: stats API call blocked for user:', username);
      return;
    }
    
    // Add debouncing to prevent rapid stats API calls
    setTimeout(async () => {
      try {
        const response = await fetch(`${API_BASE}/stats/${username}`);
        if (response.ok) {
          const stats = await response.json();
          setState(prev => ({ ...prev, playerStats: stats }));
          console.log('✅ Stats fetched successfully for:', username);
        }
      } catch (error) {
        console.error('Failed to fetch user stats:', error);
      }
    }, 2000); // 2 second debounce
  }, []);

  const clearGames = useCallback(() => {
    setState(prev => ({ ...prev, games: [], currentGame: null }));
    stopPolling();
  }, [stopPolling]);

  const createGame = useCallback(async (gameName: string, userName: string): Promise<Game> => {
    try {
      const response = await fetch(`${API_BASE}/game/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameName, userName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create game: ${response.statusText}`);
      }

      const data = await response.json();
      const game = data.game;
      setState(prev => ({ ...prev, currentGame: game }));
      startPolling();
      return game;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [startPolling]);

  const joinGame = useCallback(async (gameId: string, userName: string): Promise<Game> => {
    const endpoint = `join-game-${gameId}`;
    
    // Apply rate limiting - but be lenient for join operations
    if (isRateLimited(endpoint)) {
      console.log('🚫 Rate limited: joinGame call blocked for gameId:', gameId);
      // Wait a bit and retry instead of throwing an error
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    try {
      console.log('🎮 Attempting to join game:', gameId, 'as user:', userName);
      const response = await fetch(`${API_BASE}/game/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, userName }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to join game: ${response.statusText}`);
      }

      const data = await response.json();
      const game = data.game;
      setState(prev => ({ ...prev, currentGame: game }));
      startPolling();
      console.log('✅ Successfully joined game:', gameId);
      return game;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error joining game:', errorMessage);
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [startPolling]);

  const makeMove = useCallback(async (gameId: string, userName: string, position: number): Promise<Game> => {
    try {
      const response = await fetch(`${API_BASE}/game/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, userName, position }),
      });

      if (!response.ok) {
        throw new Error(`Failed to make move: ${response.statusText}`);
      }

      const data = await response.json();
      const game = data.game;
      setState(prev => ({ ...prev, currentGame: game }));
      return game;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  const leaveGame = useCallback(async (gameId: string, userName: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/game/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, userName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to leave game: ${response.statusText}`);
      }

      setState(prev => ({ ...prev, currentGame: null }));
      stopPolling();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    ...state,
    subscribeToLobby,
    subscribeToUser,
    clearGames,
    createGame,
    joinGame,
    makeMove,
    leaveGame
  };
} 