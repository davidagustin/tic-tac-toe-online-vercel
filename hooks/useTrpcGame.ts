'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

const API_BASE = process.env.NODE_ENV === 'development' ? 'http://localhost:3000/api' : '/api';

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
  isRefreshing: boolean;
}

// Simple rate limiting to prevent excessive API calls
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW = 1000; // 1 second

function isRateLimited(endpoint: string): boolean {
  const now = Date.now();
  const lastCall = rateLimitMap.get(endpoint);
  
  if (lastCall && now - lastCall < RATE_LIMIT_WINDOW) {
    return true;
  }
  
  rateLimitMap.set(endpoint, now);
  return false;
}

export function useTrpcGame() {
  const [state, setState] = useState<GameState>({
    isConnected: true, // Always connected since we're using manual refresh
    currentGame: null,
    games: [],
    chatMessages: [],
    playerStats: null,
    error: null,
    isRefreshing: false
  });

  // Manual refresh functions
  const refreshGames = useCallback(async () => {
    if (isRateLimited('game-list')) {
      console.log('🚫 Rate limited: games refresh blocked');
      return;
    }

    setState(prev => ({ ...prev, isRefreshing: true, error: null }));
    
    try {
      console.log('🔄 Manually refreshing games...');
      const response = await fetch(`${API_BASE}/game/list`);
      if (response.ok) {
        const games = await response.json();
        setState(prev => ({ ...prev, games, isRefreshing: false }));
        console.log(`✅ Refreshed ${games.length} games`);
      } else {
        throw new Error(`Failed to fetch games: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error refreshing games:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to refresh games',
        isRefreshing: false 
      }));
    }
  }, []);

  const refreshCurrentGame = useCallback(async (gameId?: string) => {
    const targetGameId = gameId || state.currentGame?.id;
    if (!targetGameId) return;

    if (isRateLimited(`game-${targetGameId}`)) {
      console.log('🚫 Rate limited: current game refresh blocked');
      return;
    }

    setState(prev => ({ ...prev, isRefreshing: true, error: null }));
    
    try {
      console.log('🔄 Manually refreshing current game...');
      const response = await fetch(`${API_BASE}/games/${targetGameId}`);
      if (response.ok) {
        const game = await response.json();
        setState(prev => ({ ...prev, currentGame: game, isRefreshing: false }));
        console.log('✅ Refreshed current game');
      } else {
        throw new Error(`Failed to fetch game: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error refreshing current game:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to refresh game',
        isRefreshing: false 
      }));
    }
  }, [state.currentGame?.id]);

  const refreshChatMessages = useCallback(async (gameId?: string) => {
    const targetGameId = gameId || state.currentGame?.id;
    if (!targetGameId) return;

    if (isRateLimited(`chat-${targetGameId}`)) {
      console.log('🚫 Rate limited: chat refresh blocked');
      return;
    }

    try {
      console.log('🔄 Manually refreshing chat messages...');
      const response = await fetch(`${API_BASE}/chat?gameId=${targetGameId}`);
      if (response.ok) {
        const chatMessages = await response.json();
        setState(prev => ({ ...prev, chatMessages }));
        console.log(`✅ Refreshed ${chatMessages.length} chat messages`);
      } else {
        throw new Error(`Failed to fetch chat: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error refreshing chat messages:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to refresh chat'
      }));
    }
  }, [state.currentGame?.id]);

  const refreshUserStats = useCallback(async (username: string) => {
    if (isRateLimited(`stats-${username}`)) {
      console.log('🚫 Rate limited: stats refresh blocked');
      return;
    }

    try {
      console.log('🔄 Manually refreshing user stats...');
      const response = await fetch(`${API_BASE}/stats/${username}`);
      if (response.ok) {
        const stats = await response.json();
        setState(prev => ({ ...prev, playerStats: stats }));
        console.log('✅ Refreshed user stats');
      } else {
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error refreshing user stats:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to refresh stats'
      }));
    }
  }, []);

  // Initial data fetch when component mounts
  const initializeData = useCallback(async (gameId?: string) => {
    console.log('🚀 Initializing data...');
    setState(prev => ({ ...prev, isConnected: true, error: null }));
    
    // Fetch initial games list
    await refreshGames();
    
    // Fetch initial game data if gameId provided
    if (gameId) {
      await refreshCurrentGame(gameId);
      await refreshChatMessages(gameId);
    }
  }, [refreshGames, refreshCurrentGame, refreshChatMessages]);

  // Legacy functions for backward compatibility
  const subscribeToLobby = useCallback((gameId?: string) => {
    console.log('📡 subscribeToLobby called - using manual refresh instead of polling');
    initializeData(gameId);
  }, [initializeData]);

  const subscribeToUser = useCallback(async (username: string): Promise<void> => {
    console.log('🔍 subscribeToUser called for:', username);
    await refreshUserStats(username);
  }, [refreshUserStats]);

  const clearGames = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      games: [], 
      currentGame: null, 
      chatMessages: [],
      error: null 
    }));
  }, []);

  const createGame = useCallback(async (gameName: string, userName: string): Promise<Game> => {
    try {
      console.log('🎮 Creating game:', gameName, 'for user:', userName);
      const response = await fetch(`${API_BASE}/game/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameName, userName }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create game: ${response.statusText}`);
      }

      const data = await response.json();
      const game = data.game;
      
      // Refresh games list after creating a new game
      await refreshGames();
      
      console.log('✅ Game created successfully:', game);
      return game;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error creating game:', errorMessage);
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [refreshGames]);

  const joinGame = useCallback(async (gameId: string, userName: string): Promise<Game> => {
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
      
      // Refresh current game and chat after joining
      setState(prev => ({ ...prev, currentGame: game }));
      await refreshChatMessages(gameId);
      
      console.log('✅ Successfully joined game:', gameId);
      return game;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error joining game:', errorMessage);
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [refreshChatMessages]);

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
      
      // Refresh current game after making a move
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

      setState(prev => ({ 
        ...prev, 
        currentGame: null,
        chatMessages: []
      }));
      
      // Refresh games list after leaving
      await refreshGames();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [refreshGames]);

  return {
    ...state,
    refreshGames,
    refreshCurrentGame,
    refreshChatMessages,
    refreshUserStats,
    initializeData,
    subscribeToLobby,
    subscribeToUser,
    clearGames,
    createGame,
    joinGame,
    makeMove,
    leaveGame
  };
} 