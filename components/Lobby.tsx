'use client';

import { useTrpcGame } from '@/hooks/useTrpcGame';
import { useState } from 'react';
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
  const { isConnected, playerStats, refreshUserStats, isRefreshing } = useTrpcGame();
  const [view, setView] = useState<'games' | 'chat'>('games');

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
    console.log('🎮 Lobby: handleJoinGame called with gameId:', gameId);
    console.log('🎮 Lobby: onJoinGame callback exists:', !!onJoinGame);
    if (onJoinGame) {
      console.log('🎮 Lobby: Calling onJoinGame callback...');
      try {
        onJoinGame(gameId);
        console.log('🎮 Lobby: onJoinGame callback completed');
      } catch (error) {
        console.error('🎮 Lobby: Error in onJoinGame callback:', error);
      }
    } else {
      console.log('🎮 Lobby: No onJoinGame callback provided');
    }
  };

  // Manual refresh function for user stats
  const handleRefreshStats = () => {
    console.log('🔄 Manual stats refresh triggered');
    refreshUserStats(userName);
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
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-green-600 to-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
            <span className="text-white text-lg sm:text-xl">🏆</span>
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-white mb-1">Wins</h3>
          <p className="text-xl sm:text-2xl font-bold text-green-300">{userStats.wins}</p>
        </div>

        <div className="card text-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
            <span className="text-white text-lg sm:text-xl">📊</span>
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-white mb-1">Win Rate</h3>
          <p className="text-xl sm:text-2xl font-bold text-blue-300">
            {(userStats.totalGames || userStats.total_games || 0) > 0 ? 
              Math.round((userStats.wins / (userStats.totalGames || userStats.total_games || 1)) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Stats Refresh Button */}
      <div className="text-center mb-6">
        <button
          onClick={handleRefreshStats}
          disabled={isRefreshing}
          className={`btn-secondary flex items-center gap-2 px-4 py-2 mx-auto ${
            isRefreshing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-600'
          }`}
        >
          {isRefreshing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Refreshing Stats...
            </>
          ) : (
            <>
              <span>🔄</span>
              Refresh Stats
            </>
          )}
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex space-x-1 bg-white/10 rounded-lg p-1">
          <button
            onClick={() => setView('games')}
            className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors ${
              view === 'games'
                ? 'bg-purple-600 text-white'
                : 'text-purple-200 hover:text-white hover:bg-white/10'
            }`}
          >
            🎮 Games
          </button>
          <button
            onClick={() => setView('chat')}
            className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors ${
              view === 'chat'
                ? 'bg-purple-600 text-white'
                : 'text-purple-200 hover:text-white hover:bg-white/10'
            }`}
          >
            💬 Global Chat
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {view === 'games' ? (
          <GameManager userName={userName} onJoinGame={handleJoinGame} />
        ) : (
          <div className="max-w-2xl mx-auto">
            <ChatRoom 
              userName={userName}
              title="Global Chat"
              description="Chat with all players in the lobby"
              theme="lobby"
              icon="💬"
            />
          </div>
        )}
      </div>
    </div>
  );
} 