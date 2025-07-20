'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePusher } from '@/hooks/usePusher';
import type { Game } from '@/lib/pusher-client';

// Add the missing constant
const MAX_RECONNECT_ATTEMPTS = 5;

interface GameManagerProps {
  userName: string;
  onJoinGame: (gameId: string) => void;
}

export default function GameManager({ userName, onJoinGame }: GameManagerProps) {
  const { isConnected, isInitializing, connectionError, isFallbackMode, reconnectAttempts, isConnecting, connect: manualReconnect } = usePusher();
  const [games, setGames] = useState<Game[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGameName, setNewGameName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'waiting' | 'playing'>('all');

  // Load games on mount
  useEffect(() => {
    const loadGames = async () => {
      try {
        const response = await fetch('/api/game/list');
        if (response.ok) {
          const gamesData = await response.json();
          setGames(gamesData);
        }
      } catch {
        console.error('Failed to load games');
      }
    };

    loadGames();
  }, []);

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
      setNewGameName('');
      setShowCreateForm(false);
    } catch (error: unknown) {
      console.error('Error creating game:', error);
      alert(error instanceof Error ? error.message : 'Failed to create game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [newGameName, userName]);

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
      
      // Call the parent callback to handle navigation
      onJoinGame(gameId);
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
    if (isInitializing) return { text: 'Initializing...', color: 'text-yellow-500' };
    if (isConnecting) return { text: 'Connecting...', color: 'text-blue-500' };
    if (isConnected) return { text: 'Connected', color: 'text-green-500' };
    if (isFallbackMode) return { text: 'Using Fallback Mode', color: 'text-orange-500' };
    if (connectionError) return { text: 'Connection Error', color: 'text-red-500' };
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
            {isFallbackMode && (
              <span className="text-sm text-orange-300">
                (Real-time updates disabled)
              </span>
            )}
            {reconnectAttempts > 0 && (
              <span className="text-sm text-yellow-300">
                (Attempt {reconnectAttempts}/{MAX_RECONNECT_ATTEMPTS})
              </span>
            )}
          </div>
          
          {!isConnected && !isConnecting && (
            <button
              onClick={manualReconnect}
              disabled={isConnecting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isConnecting ? 'Connecting...' : 'Reconnect'}
            </button>
          )}
        </div>
        
        {connectionError && (
          <div className="mt-2 text-sm text-red-300">
            Error: {connectionError}
          </div>
        )}
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