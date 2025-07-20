'use client';

import { usePusher } from '@/hooks/usePusher';
import { useEffect, useState } from 'react';
import ChatRoom from './ChatRoom';
import GameManager from './GameManager';

interface UserStats {
  wins: number;
  losses: number;
  draws: number;
  totalGames?: number;
  total_games?: number;
}

interface LobbyProps {
  userName: string;
  onJoinGame?: (gameId: string) => void;
}

export default function Lobby({ userName, onJoinGame }: LobbyProps) {
  const { isConnected, playerStats, subscribeToUser } = usePusher();
  const [view, setView] = useState<'games' | 'chat'>('games');

  // Subscribe to user stats when component mounts
  useEffect(() => {
    subscribeToUser(userName);
  }, [subscribeToUser, userName]);

  // Use playerStats from Pusher hook with proper type handling
  const userStats: UserStats = playerStats ? {
    wins: playerStats.wins,
    losses: playerStats.losses,
    draws: playerStats.draws,
    totalGames: playerStats.totalGames,
    total_games: (playerStats as { total_games?: number }).total_games || playerStats.totalGames
  } : {
    wins: 0,
    losses: 0,
    draws: 0,
    total_games: 0
  };

  const handleJoinGame = (gameId: string) => {
    console.log('Joining game:', gameId);
    if (onJoinGame) {
      onJoinGame(gameId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 mobile-padding py-4 sm:py-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 sm:mb-8">
        <div className="text-center">
          <h1 className="mobile-heading font-bold text-white mb-2 sm:mb-4">
            Welcome to Tic-Tac-Toe Online! 🎮
          </h1>
          <p className="text-lg sm:text-xl text-purple-200 mb-4 sm:mb-6">
            Hello, <span className="text-yellow-300 font-semibold">{userName}</span>! Ready to play?
          </p>

          {/* Connection Status */}
          <div className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium ${isConnected
            ? 'bg-green-500/20 text-green-300 border border-green-400/30'
            : 'bg-red-500/20 text-red-300 border border-red-400/30'
            }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>

      {/* Quick Stats - Mobile Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto mb-6 sm:mb-8">
        <div className="card text-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-600 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
            <span className="text-white text-lg sm:text-xl">🎮</span>
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-white mb-1">Total Games</h3>
          <p className="text-xl sm:text-2xl font-bold text-purple-300">{userStats.totalGames || userStats.total_games || 0}</p>
        </div>

        <div className="card text-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
            <span className="text-white text-lg sm:text-xl">🏆</span>
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-white mb-1">Games Won</h3>
          <p className="text-xl sm:text-2xl font-bold text-green-300">{userStats.wins}</p>
        </div>

        <div className="card text-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
            <span className="text-white text-lg sm:text-xl">📊</span>
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-white mb-1">Win Rate</h3>
          <p className="text-xl sm:text-2xl font-bold text-yellow-300">
            {(() => {
              const totalGames = userStats.totalGames || userStats.total_games || 0;
              return totalGames > 0 ? Math.round((userStats.wins / totalGames) * 100) : 0;
            })()}%
          </p>
        </div>
      </div>

      {/* Navigation Tabs - Mobile Optimized */}
      <div className="max-w-4xl mx-auto mb-4 sm:mb-6">
        <div className="flex space-x-1 bg-white/10 backdrop-blur-lg rounded-2xl p-1 border border-white/20">
          <button
            onClick={() => setView('games')}
            className={`flex-1 py-2 sm:py-3 px-3 sm:px-6 rounded-xl font-medium transition-all duration-300 text-sm sm:text-base touch-target ${view === 'games'
              ? 'bg-gradient-to-r from-purple-600 to-pink-400 text-white shadow-lg'
              : 'text-purple-200 hover:text-white hover:bg-white/10'
              }`}
          >
            <span className="hidden sm:inline">🎮 Games</span>
            <span className="sm:hidden">🎮</span>
          </button>
          <button
            onClick={() => setView('chat')}
            className={`flex-1 py-2 sm:py-3 px-3 sm:px-6 rounded-xl font-medium transition-all duration-300 text-sm sm:text-base touch-target ${view === 'chat'
              ? 'bg-gradient-to-r from-purple-600 to-pink-400 text-white shadow-lg'
              : 'text-purple-200 hover:text-white hover:bg-white/10'
              }`}
          >
            <span className="hidden sm:inline">💬 Chat</span>
            <span className="sm:hidden">💬</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto">
        {view === 'games' ? (
          <GameManager userName={userName} onJoinGame={handleJoinGame} />
        ) : (
          <ChatRoom
            userName={userName}
            title="Game Lobby"
            description="Chat with other players before starting a game"
            theme="blue"
            icon="🏠"
          />
        )}
      </div>
    </div>
  );
} 