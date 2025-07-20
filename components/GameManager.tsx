'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePusher } from '@/hooks/usePusher';

interface Game {
  id: string;
  name: string;
  players: string[];
  status: 'waiting' | 'playing' | 'finished';
  createdBy: string;
  createdAt: string;
  board: (string | null)[];
  currentPlayer: string | null;
  winner: string | null;
}

interface GameManagerProps {
  userName: string;
  onJoinGame: (gameId: string) => void;
}

export default function GameManager({ userName, onJoinGame }: GameManagerProps) {
  const { isConnected, games: pusherGames, subscribeToLobby } = usePusher();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGameName, setNewGameName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'waiting' | 'playing'>('all');
  const [fallbackGames, setFallbackGames] = useState<Game[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use games from Pusher hook, fallback to local state if Pusher fails
  const games = pusherGames && pusherGames.length > 0 ? pusherGames : fallbackGames;

  // Manual refresh function
  const refreshGames = useCallback(async () => {
    setIsRefreshing(true);
    try {
      console.log('🔄 Manually refreshing games from API...');
      const response = await fetch('/api/game/list');
      if (response.ok) {
        const gamesData = await response.json();
        console.log(`🔄 Refresh - Found ${gamesData.length} games:`, gamesData);
        setFallbackGames(gamesData);
      } else {
        console.log(`🔄 Refresh - API returned ${response.status}`);
      }
    } catch (error) {
      console.error('🔄 Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Subscribe to lobby when component mounts
  useEffect(() => {
    if (isConnected) {
      console.log('🎮 GameManager: Subscribing to lobby...');
      subscribeToLobby();
    }
  }, [isConnected, subscribeToLobby]);

  // Initial load of games from API
  useEffect(() => {
    refreshGames();
  }, [refreshGames]);

  const handleCreateGame = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGameName.trim()) return;

    try {
      // Client-side validation
      if (newGameName.length > 100) {
        alert('Game name too long. Maximum 100 characters allowed.');
        return;
      }

      // Check for potentially malicious content
      const suspiciousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(newGameName)) {
          alert('Game name contains invalid content.');
          return;
        }
      }

      setIsLoading(true);
      
      const response = await fetch('/api/game/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameName: newGameName.trim(),
          userName: userName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create game');
      }

      console.log('Game created successfully:', data.game);
      console.log('🎮 GameManager: Game creation successful, calling onJoinGame with ID:', data.game.id);
      setNewGameName('');
      setShowCreateForm(false);
      
      // Optionally, automatically join the created game
      if (onJoinGame) {
        console.log('🎮 GameManager: Calling onJoinGame callback...');
        onJoinGame(data.game.id);
        console.log('🎮 GameManager: onJoinGame callback completed');
      } else {
        console.log('🎮 GameManager: No onJoinGame callback provided');
      }
    } catch (error: unknown) {
      console.error('Error creating game:', error);
      alert(error instanceof Error ? error.message : 'Failed to create game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [newGameName, userName, onJoinGame]);

  const handleJoinGame = useCallback(async (gameId: string) => {
    try {
      // Basic validation
      if (!gameId || typeof gameId !== 'string') {
        alert('Invalid game ID.');
        return;
      }

      // Check if user is already in the game
      const game = games.find(g => g.id === gameId);
      if (game && game.players.includes(userName)) {
        alert('You are already in this game.');
        return;
      }

      console.log('Joining game:', gameId, 'as user:', userName);
      
      const response = await fetch('/api/game/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId: gameId,
          userName: userName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join game');
      }

      console.log('Joined game successfully:', data.game);
      
      // Navigate to the game
      if (onJoinGame) {
        onJoinGame(gameId);
      }
    } catch (error: unknown) {
      console.error('Error joining game:', error);
      alert(error instanceof Error ? error.message : 'Failed to join game. Please try again.');
    }
  }, [userName, onJoinGame, games]);

  const getStatusColor = (status: Game['status']) => {
    switch (status) {
      case 'waiting': return 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border-yellow-400/30';
      case 'playing': return 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border-green-400/30';
      case 'finished': return 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-300 border-gray-400/30';
      default: return 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-300 border-gray-400/30';
    }
  };

  const getStatusIcon = (status: Game['status']) => {
    switch (status) {
      case 'waiting': return '⏳';
      case 'playing': return '🎮';
      case 'finished': return '🏁';
      default: return '❓';
    }
  };

  const filteredGames = games.filter(game => filter === 'all' || game.status === filter);

  const getConnectionStatus = () => {
    if (isConnected) {
      return { 
        text: 'Connected', 
        color: 'text-green-500' 
      };
    }
    return { text: 'Disconnected', color: 'text-gray-500' };
  };

  const status = getConnectionStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      {/* Connection Status */}
      <div className="mb-6 p-4 bg-white bg-opacity-10 backdrop-blur-lg rounded-lg border border-white border-opacity-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${status.color.replace('text-', 'bg-')}`}></div>
            <span className={`font-medium ${status.color}`}>
              {status.text}
            </span>
          </div>
          

        </div>
      </div>

      {/* Create Game Section */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Create New Game</h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-400 text-white rounded-xl font-medium hover:from-purple-700 hover:to-pink-500 transition-all duration-300"
          >
            {showCreateForm ? 'Cancel' : 'Create Game'}
          </button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreateGame} className="space-y-4">
            <div>
              <label htmlFor="gameName" className="block text-sm font-medium text-purple-200 mb-2">
                Game Name
              </label>
              <input
                type="text"
                id="gameName"
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                placeholder="Enter game name..."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                maxLength={100}
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !newGameName.trim()}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-400 text-white rounded-xl font-medium hover:from-purple-700 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              {isLoading ? 'Creating...' : 'Create Game'}
            </button>
          </form>
        )}
      </div>

      {/* Games List Section */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Available Games</h2>
          <div className="flex space-x-2">
            {(['all', 'waiting', 'playing'] as const).map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-300 ${
                  filter === filterOption
                    ? 'bg-gradient-to-r from-purple-600 to-pink-400 text-white'
                    : 'bg-white/10 text-purple-200 hover:bg-white/20'
                }`}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </button>
            ))}
            <button
              onClick={refreshGames}
              disabled={isRefreshing}
              className="px-3 py-1 rounded-lg text-sm font-medium transition-all duration-300 bg-white/10 text-purple-200 hover:bg-white/20"
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {isConnected && filteredGames.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🎮</div>
            <p className="text-purple-200">No games available. Create one to get started!</p>
          </div>
        )}

        {isConnected && filteredGames.length > 0 && (
          <div className="grid gap-4">
            {filteredGames.map((game) => (
              <div
                key={game.id}
                className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{game.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(game.status)}`}>
                        {getStatusIcon(game.status)} {game.status}
                      </span>
                    </div>
                    <div className="text-sm text-purple-200">
                      <p>Created by: <span className="text-yellow-300">{game.createdBy}</span></p>
                      <p>Players: {game.players.length}/2</p>
                      <p>Created: {new Date(game.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {game.status === 'waiting' && !game.players.includes(userName) && (
                      <button
                        onClick={() => handleJoinGame(game.id)}
                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-600 transition-all duration-300"
                      >
                        Join
                      </button>
                    )}
                    {game.players.includes(userName) && (
                      <button
                        onClick={() => onJoinGame(game.id)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-700 hover:to-cyan-600 transition-all duration-300"
                      >
                        Enter
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 