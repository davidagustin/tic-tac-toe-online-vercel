'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTrpcGame } from '@/hooks/useTrpcGame';

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
  console.log('🎮 GameManager: Component mounted with onJoinGame callback:', !!onJoinGame);
  const { 
    isConnected, 
    games: pusherGames, 
    subscribeToLobby, 
    refreshGames, 
    isRefreshing 
  } = useTrpcGame();

  const [showCreateForm, setShowCreateForm] = useState(true); // Show create form by default
  const [newGameName, setNewGameName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'waiting' | 'playing'>('all');
  const [fallbackGames, setFallbackGames] = useState<Game[]>([]);

  // Use games from Pusher hook, fallback to local state if Pusher fails
  const games = pusherGames && pusherGames.length > 0 ? pusherGames : fallbackGames;

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
    console.log('🎮 GameManager: handleCreateGame called');
    if (!newGameName.trim()) return;
    console.log('🎮 GameManager: Creating game with name:', newGameName);

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
      console.log('🎮 GameManager: onJoinGame callback exists:', !!onJoinGame);
      setNewGameName('');
      setShowCreateForm(false);

      // Refresh games list after creating
      await refreshGames();

      // Optionally, automatically join the created game
      if (onJoinGame) {
        console.log('🎮 GameManager: Calling onJoinGame callback with gameId:', data.game.id);
        try {
          onJoinGame(data.game.id);
          console.log('🎮 GameManager: onJoinGame callback completed');
        } catch (error) {
          console.error('🎮 GameManager: Error in onJoinGame callback:', error);
        }
      } else {
        console.log('🎮 GameManager: No onJoinGame callback provided');
      }
    } catch (error: unknown) {
      console.error('Error creating game:', error);
      alert(error instanceof Error ? error.message : 'Failed to create game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [newGameName, userName, onJoinGame, refreshGames]);

  const handleJoinGame = useCallback(async (gameId: string) => {
    try {
      // Basic validation
      if (!gameId || !userName) {
        throw new Error('Missing game ID or username');
      }

      console.log('🎮 GameManager: handleJoinGame called with gameId:', gameId);
      console.log('🎮 GameManager: onJoinGame callback exists:', !!onJoinGame);

      if (onJoinGame) {
        console.log('🎮 GameManager: Calling onJoinGame callback...');
        try {
          onJoinGame(gameId);
          console.log('🎮 GameManager: onJoinGame callback completed');
        } catch (error) {
          console.error('🎮 GameManager: Error in onJoinGame callback:', error);
          throw error;
        }
      } else {
        console.log('🎮 GameManager: No onJoinGame callback provided');
        throw new Error('No join game callback provided');
      }
    } catch (error: unknown) {
      console.error('Error joining game:', error);
      alert(error instanceof Error ? error.message : 'Failed to join game. Please try again.');
    }
  }, [userName, onJoinGame]);

  const handleShowCreateForm = () => {
    setShowCreateForm(true);
  };

  const getStatusColor = (status: Game['status']) => {
    switch (status) {
      case 'waiting': return 'text-yellow-400';
      case 'playing': return 'text-green-400';
      case 'finished': return 'text-gray-400';
      default: return 'text-gray-400';
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

  const filteredGames = games.filter(game => {
    if (filter === 'all') return true;
    return game.status === filter;
  });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header with Refresh Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Game Lobby</h2>
          <p className="text-purple-200">Find a game to join or create your own!</p>
        </div>
        
        {/* Manual Refresh Button */}
        <button
          onClick={refreshGames}
          disabled={isRefreshing}
          className={`btn-secondary flex items-center gap-2 px-4 py-2 text-sm ${
            isRefreshing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-600'
          }`}
        >
          {isRefreshing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Refreshing...
            </>
          ) : (
            <>
              <span>🔄</span>
              Refresh Games
            </>
          )}
        </button>
      </div>

      {/* Create Game Section */}
      {showCreateForm && (
        <div className="card mb-6">
          <h3 className="text-xl font-semibold text-white mb-4">Create New Game</h3>
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
                placeholder="Enter a name for your game..."
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                maxLength={100}
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isLoading || !newGameName.trim()}
                className="btn-primary flex-1"
              >
                {isLoading ? 'Creating...' : 'Create Game'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Games List Section */}
      <div className="card">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">Available Games</h3>
            <p className="text-purple-200 text-sm">
              {filteredGames.length} game{filteredGames.length !== 1 ? 's' : ''} available
            </p>
          </div>
          
          {!showCreateForm && (
            <button
              onClick={handleShowCreateForm}
              className="btn-primary text-sm px-4 py-2"
            >
              Create Game
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 mb-6 bg-white/10 rounded-lg p-1">
          {(['all', 'waiting', 'playing'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-purple-600 text-white'
                  : 'text-purple-200 hover:text-white hover:bg-white/10'
              }`}
            >
              {status === 'all' ? 'All Games' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Games Grid */}
        {filteredGames.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎮</div>
            <h4 className="text-xl font-semibold text-white mb-2">No games available</h4>
            <p className="text-purple-200 mb-4">
              {filter === 'all' 
                ? "No games have been created yet. Be the first to create one!"
                : `No ${filter} games available. Try a different filter or create a new game.`
              }
            </p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="btn-secondary text-sm px-4 py-2"
              >
                Show All Games
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGames.map((game) => (
              <div
                key={game.id}
                className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-4 hover:bg-white/15 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-lg font-semibold text-white truncate flex-1">
                    {game.name}
                  </h4>
                  <span className={`text-sm font-medium ${getStatusColor(game.status)}`}>
                    {getStatusIcon(game.status)} {game.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-200">Players:</span>
                    <span className="text-white">{game.players.length}/2</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-200">Created by:</span>
                    <span className="text-white truncate ml-2">{game.createdBy}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-200">Created:</span>
                    <span className="text-white">
                      {new Date(game.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {game.status === 'waiting' && game.players.length < 2 && (
                    <button
                      onClick={() => handleJoinGame(game.id)}
                      className="btn-primary flex-1 text-sm py-2"
                    >
                      Join Game
                    </button>
                  )}
                  {game.status === 'playing' && (
                    <button
                      onClick={() => handleJoinGame(game.id)}
                      className="btn-secondary flex-1 text-sm py-2"
                    >
                      Watch Game
                    </button>
                  )}
                  {game.status === 'finished' && (
                    <span className="text-gray-400 text-sm py-2 px-3 bg-gray-800/50 rounded flex-1 text-center">
                      Game Finished
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 