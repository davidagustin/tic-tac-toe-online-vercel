'use client';

import { useAbly } from '@/hooks/useAbly';
import React, { useCallback, useEffect, useState } from 'react';

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
  const { isConnected, games: pusherGames, subscribeToLobby } = useAbly();

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

  // Reduced polling for games to prevent overload
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (userName && showCreateForm && !isConnected) {
      console.log('Starting reduced-frequency game polling...');

      // Much less frequent polling - every 2 minutes instead of constant
      pollInterval = setInterval(async () => {
        try {
          console.log('Polling for game updates...');
          const response = await fetch('/api/game/list');
          if (response.ok) {
            const fetchedGames = await response.json();
            // Only update if games actually changed
            if (JSON.stringify(fetchedGames) !== JSON.stringify(games)) {
              console.log('Games updated from polling:', fetchedGames);
              // Update via a custom event to avoid direct state manipulation
              window.dispatchEvent(new CustomEvent('games-updated', {
                detail: fetchedGames
              }));
            }
          }
        } catch (error) {
          console.error('Error polling for games:', error);
        }
      }, 120000); // 2 minutes instead of frequent polling
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [userName, showCreateForm, isConnected, games]);

  // Listen for custom game update events
  useEffect(() => {
    const handleGamesUpdate = (event: CustomEvent) => {
      console.log('Received games update event');
      // Update games state from polling result
      setFallbackGames(event.detail);
    };

    window.addEventListener('games-updated', handleGamesUpdate as EventListener);

    return () => {
      window.removeEventListener('games-updated', handleGamesUpdate as EventListener);
    };
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



  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Create Game Section */}
      <div className="card">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4 sm:mb-6">
          <h2 className="mobile-heading font-bold text-white">Create New Game</h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn-primary w-full sm:w-auto touch-target"
          >
            {showCreateForm ? 'Cancel' : 'Create Game'}
          </button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreateGame} className="space-y-4">
            <div>
              <label htmlFor="gameName" className="block mobile-text font-medium text-purple-200 mb-2">
                Game Name
              </label>
              <input
                type="text"
                id="gameName"
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                placeholder="Enter game name..."
                className="input-primary"
                maxLength={100}
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !newGameName.trim()}
              className="btn-primary w-full"
            >
              {isLoading ? 'Creating...' : 'Create Game'}
            </button>
          </form>
        )}
      </div>

      {/* Games List Section */}
      <div className="card">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4 sm:mb-6">
          <h2 className="mobile-heading font-bold text-white">Available Games</h2>
          <div className="flex flex-wrap gap-2">
            {(['all', 'waiting', 'playing'] as const).map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-3 py-2 rounded-lg mobile-text font-medium transition-all duration-300 touch-target ${filter === filterOption
                  ? 'bg-gradient-to-r from-purple-600 to-pink-400 text-white'
                  : 'bg-white/10 text-purple-200 hover:bg-white/20'
                  }`}
              >
                <span className="hidden sm:inline">{filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}</span>
                <span className="sm:hidden">
                  {filterOption === 'all' ? 'All' : filterOption === 'waiting' ? 'Wait' : 'Play'}
                </span>
              </button>
            ))}
            <button
              onClick={refreshGames}
              disabled={isRefreshing}
              className="px-3 py-2 rounded-lg mobile-text font-medium transition-all duration-300 bg-white/10 text-purple-200 hover:bg-white/20 touch-target"
            >
              {isRefreshing ? '🔄' : '🔄'}
            </button>
          </div>
        </div>

        {filteredGames.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🎮</div>
            <p className="text-purple-200 mobile-text">No games available. Create one to get started!</p>
          </div>
        )}

        {filteredGames.length > 0 && (
          <div className="space-y-4">
            {filteredGames.map((game) => (
              <div
                key={game.id}
                className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300"
              >
                <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-white truncate">{game.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(game.status)} w-fit`}>
                        {getStatusIcon(game.status)} {game.status}
                      </span>
                    </div>
                    <div className="mobile-text text-purple-200 space-y-1">
                      <p>Created by: <span className="text-yellow-300">{game.createdBy}</span></p>
                      <p>Players: {game.players.length}/2</p>
                      <p className="hidden sm:block">Created: {new Date(game.createdAt).toLocaleString()}</p>
                      <p className="sm:hidden">Created: {new Date(game.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                    {game.status === 'waiting' && !game.players.includes(userName) && (
                      <button
                        onClick={() => handleJoinGame(game.id)}
                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-600 transition-all duration-300 touch-target w-full sm:w-auto"
                      >
                        Join Game
                      </button>
                    )}
                    {game.players.includes(userName) && (
                      <button
                        onClick={() => onJoinGame(game.id)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-700 hover:to-cyan-600 transition-all duration-300 touch-target w-full sm:w-auto"
                      >
                        Enter Game
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