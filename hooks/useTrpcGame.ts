'use client';

import { useState, useCallback } from 'react';

interface GameState {
  id: string;
  name: string;
  board: string[];
  currentPlayer: string;
  players: string[];
  status: 'waiting' | 'playing' | 'finished';
  winner?: string;
  lastMove?: {
    position: number;
    symbol: string;
    player: string;
  };
}

interface UserStats {
  username: string;
  stats: {
    wins: number;
    losses: number;
    draws: number;
  };
  totalGames: number;
}

interface GameEvent {
  type: string;
  gameId: string;
  data: any;
  timestamp: number;
  userId?: string;
}

export function useTrpcGame() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createGame = useCallback(async (gameName: string, userName: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/game/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gameName, userName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create game');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create game';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const joinGame = useCallback(async (gameId: string, userName: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/game/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gameId, userName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join game');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join game';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const makeMove = useCallback(async (gameId: string, position: number, userName: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/game/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gameId, position, userName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to make move');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to make move';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const leaveGame = useCallback(async (gameId: string, userName: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/game/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gameId, userName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to leave game');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to leave game';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getStats = useCallback(async (username: string): Promise<UserStats> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/stats/${username}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get stats');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get stats';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getGameEvents = useCallback(async (gameId: string, since?: number): Promise<{ game: GameState; events: GameEvent[] }> => {
    try {
      const params = new URLSearchParams({ gameId });
      if (since) {
        params.append('since', since.toString());
      }

      const response = await fetch(`/api/trpc/game.getEvents?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get game events');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get game events';
      setError(errorMessage);
      throw err;
    }
  }, []);

  return {
    loading,
    error,
    createGame,
    joinGame,
    makeMove,
    leaveGame,
    getStats,
    getGameEvents,
  };
} 