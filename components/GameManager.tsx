'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';

interface Game {
  id: string;
  name: string;
  players: string[];
  status: 'waiting' | 'playing' | 'finished';
  createdBy: string;
  createdAt: Date;
}

interface GameManagerProps {
  userName: string;
  onJoinGame: (gameId: string) => void;
}

export default function GameManager({ userName, onJoinGame }: GameManagerProps) {
  const { socket, isConnected } = useSocket();
  const [games, setGames] = useState<Game[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGameName, setNewGameName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'waiting' | 'playing' | 'finished'>('all');

  useEffect(() => {
    if (!socket) return;

    // Request games list from server
    socket.emit('get games');

    // Listen for game updates
    socket.on('games list', (gamesList: Game[]) => {
      setGames(gamesList);
    });

    socket.on('game created', (newGame: Game) => {
      setGames(prev => [...prev, newGame]);
    });

    socket.on('game created success', (newGame: Game) => {
      console.log('Game created successfully:', newGame);
      setGames(prev => [...prev, newGame]);
      setNewGameName('');
      setShowCreateForm(false);
      setIsLoading(false);
    });

    socket.on('game joined', (gameId: string, player: string) => {
      console.log('Game joined event received:', gameId, 'by player:', player);
      setGames(prev => {
        const updatedGames = prev.map(game => 
          game.id === gameId 
            ? { ...game, players: [...game.players, player] }
            : game
        );
        
        // Check if the game is now full and current user is in it
        const updatedGame = updatedGames.find(g => g.id === gameId);
        if (updatedGame && updatedGame.players.length === 2 && updatedGame.players.includes(userName)) {
          console.log('Game is now full and current user is in it, redirecting to game board');
          // Use setTimeout to ensure state is updated before redirecting
          setTimeout(() => onJoinGame(gameId), 100);
        }
        
        return updatedGames;
      });
    });

    socket.on('game started', (gameId: string) => {
      console.log('Game started event received for game:', gameId);
      setGames(prev => prev.map(game => 
        game.id === gameId 
          ? { ...game, status: 'playing' as const }
          : game
      ));
      
      // Check if current user is in this game and redirect them
      const game = games.find(g => g.id === gameId);
      if (game && game.players.includes(userName)) {
        console.log('Current user is in this game, redirecting to game board');
        onJoinGame(gameId);
      }
    });

    socket.on('game removed', (gameId: string) => {
      setGames(prev => prev.filter(game => game.id !== gameId));
    });

    socket.on('game updated', (updatedGame: Game) => {
      setGames(prev => prev.map(game => 
        game.id === updatedGame.id ? updatedGame : game
      ));
    });

    // Handle server errors
    socket.on('error', (error: { message: string; existingGameId?: string }) => {
      console.error('Server error:', error);
      setIsLoading(false);
      
      if (error.message.includes('already have an active game')) {
        alert(`Error: ${error.message}`);
        // Optionally redirect to the existing game
        if (error.existingGameId) {
          console.log('Redirecting to existing game:', error.existingGameId);
          onJoinGame(error.existingGameId);
        }
      } else {
        alert(`Error: ${error.message}`);
      }
    });

    return () => {
      socket.off('games list');
      socket.off('game created');
      socket.off('game created success');
      socket.off('game joined');
      socket.off('game started');
      socket.off('game removed');
      socket.off('game updated');
      socket.off('error');
    };
  }, [socket, userName, onJoinGame, games]);

  const handleCreateGame = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !newGameName.trim()) return;

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
      
      const newGame: Game = {
        id: Date.now().toString(),
        name: newGameName.trim(),
        players: [userName],
        status: 'waiting',
        createdBy: userName,
        createdAt: new Date()
      };

      console.log('Emitting create game event:', newGame);
      socket.emit('create game', newGame);
      setNewGameName('');
      setShowCreateForm(false);
    } catch (error: any) {
      console.error('Error creating game:', error);
      
      // Handle socket errors
      if (error.message?.includes('Rate limit')) {
        alert('Rate limit exceeded. Please wait a moment before creating another game.');
      } else if (error.message?.includes('Maximum games')) {
        alert('You have reached the maximum number of games. Please join an existing game or wait for one to finish.');
      } else if (error.message?.includes('Invalid')) {
        alert('Invalid game data. Please check your input.');
      } else {
        alert('Failed to create game. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [socket, newGameName, userName]);

  const handleJoinGame = useCallback((gameId: string) => {
    if (!socket) {
      alert('Not connected to server. Please wait for connection.');
      return;
    }
    
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
      socket.emit('join game', gameId, userName);
      
      // Show success message
      alert('Joining game... You will be redirected to the game board.');
      
      // Call the parent callback to handle navigation
      onJoinGame(gameId);
    } catch (error: any) {
      console.error('Error joining game:', error);
      
      if (error.message?.includes('Rate limit')) {
        alert('Rate limit exceeded. Please wait a moment before trying again.');
      } else if (error.message?.includes('Invalid')) {
        alert('Invalid game data. Please try again.');
      } else {
        alert('Failed to join game. Please try again.');
      }
    }
  }, [socket, userName, onJoinGame, games]);

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

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-400 rounded-3xl flex items-center justify-center shadow-xl">
            <span className="text-3xl">🎯</span>
          </div>
          <div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
              Game Manager
            </h2>
            <p className="text-purple-200 text-lg">Create, join, and manage your Tic-Tac-Toe games</p>
          </div>
        </div>
      </div>

      {/* Enhanced Create Game Section */}
      <div className="text-center relative z-10">
        {!showCreateForm ? (
          <button
            onClick={() => {
              console.log('Create New Game button clicked');
              console.log('isConnected:', isConnected);
              setShowCreateForm(true);
            }}
            disabled={!isConnected}
            className="bg-gradient-to-r from-purple-600 to-pink-400 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 hover:from-purple-700 hover:to-pink-500 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2 mx-auto cursor-pointer"
          >
            <span className="text-xl">➕</span>
            <span>Create New Game</span>
          </button>
        ) : (
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20 shadow-xl max-w-md mx-auto">
            <h3 className="text-2xl font-bold text-white mb-4">Create New Game</h3>
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
                  className="w-full px-4 py-3 bg-white/10 border-2 border-purple-300/30 rounded-xl focus:outline-none focus:border-purple-600 text-white placeholder-pink-200 text-lg transition-all duration-300 backdrop-blur-sm"
                  placeholder="Enter game name..."
                  autoFocus
                  disabled={isLoading}
                  required
                  maxLength={100}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isLoading || !newGameName.trim()}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-400 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 hover:from-purple-700 hover:to-pink-500 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <span>🎮</span>
                      <span>Create Game</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewGameName('');
                  }}
                  disabled={isLoading}
                  className="bg-white/10 backdrop-blur-sm text-white font-medium py-3 px-6 rounded-xl border border-white/20 transition-all duration-300 hover:bg-white/20 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Enhanced Filter Tabs */}
      <div className="flex justify-center relative z-10">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2 border border-white/20 shadow-lg">
          <div className="flex space-x-1">
            {(['all', 'waiting', 'playing', 'finished'] as const).map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => {
                  console.log('Filter button clicked:', filterOption);
                  setFilter(filterOption);
                }}
                className={`relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 capitalize cursor-pointer ${
                  filter === filterOption
                    ? 'bg-gradient-to-r from-purple-600 to-pink-400 text-white shadow-lg shadow-purple-600/25'
                    : 'text-purple-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                {filterOption === 'all' ? 'All Games' : filterOption}
                {filter === filterOption && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600 to-pink-400 opacity-0 animate-pulse"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Games List */}
      <div className="space-y-4">
        {filteredGames.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gradient-to-r from-purple-600/20 to-pink-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🎮</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No Games Available</h3>
            <p className="text-purple-200">
              {filter === 'all' 
                ? 'No games have been created yet. Be the first to create one!'
                : `No ${filter} games available.`
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredGames.map((game) => (
              <div
                key={game.id}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-400 rounded-xl flex items-center justify-center shadow-lg">
                      <span className="text-xl">🎯</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{game.name}</h3>
                      <p className="text-purple-200 text-sm">
                        Created by {game.createdBy} • {game.players.length}/2 players
                      </p>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-full border ${getStatusColor(game.status)}`}>
                    <span className="flex items-center space-x-2">
                      <span>{getStatusIcon(game.status)}</span>
                      <span className="font-semibold capitalize">{game.status}</span>
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-purple-200 text-sm">Players:</span>
                    <div className="flex space-x-1">
                      {game.players.map((player, index) => (
                        <div
                          key={index}
                          className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm"
                        >
                          {player.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {game.players.length < 2 && (
                        <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-slate-500 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                          ?
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {game.status === 'waiting' && game.players.length < 2 && (
                    <button
                      onClick={() => handleJoinGame(game.id)}
                      disabled={!isConnected || game.players.includes(userName)}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-2 px-6 rounded-xl transition-all duration-300 hover:from-green-600 hover:to-emerald-600 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2 cursor-pointer"
                    >
                      <span>🎮</span>
                      <span>{game.players.includes(userName) ? 'Already Joined' : 'Join Game'}</span>
                    </button>
                  )}
                  
                  {game.status === 'playing' && (
                    <div className="text-green-300 font-semibold flex items-center space-x-2">
                      <span>🎮</span>
                      <span>In Progress</span>
                    </div>
                  )}
                  
                  {game.status === 'finished' && (
                    <div className="text-gray-300 font-semibold flex items-center space-x-2">
                      <span>🏁</span>
                      <span>Finished</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connection Status */}
      <div className="text-center">
        <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${
          isConnected 
            ? 'bg-green-500/20 text-green-300 border border-green-400/30'
            : 'bg-red-500/20 text-red-300 border border-red-400/30'
        }`}>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
          <span className="font-medium">
            {isConnected ? 'Connected to server' : 'Disconnected from server'}
          </span>
        </div>
      </div>
    </div>
  );
} 