'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';
import GameManager from './GameManager';
import ChatRoom from './ChatRoom';

interface LobbyProps {
  userName: string;
  onJoinGame?: (gameId: string) => void;
}

interface UserStats {
  wins: number;
  losses: number;
  draws: number;
  total_games: number;
}

export default function Lobby({ userName, onJoinGame }: LobbyProps) {
  const { socket, isConnected } = useSocket();
  const [view, setView] = useState<'games' | 'chat'>('games');
  const [userStats, setUserStats] = useState<UserStats>({
    wins: 0,
    losses: 0,
    draws: 0,
    total_games: 0
  });

  const refreshUserStats = useCallback(() => {
    if (socket) {
      console.log('Refreshing user statistics for:', userName);
      socket.emit('get user statistics', userName);
    }
  }, [socket, userName]);

  useEffect(() => {
    if (!socket) return;

    // Request user statistics when component mounts
    refreshUserStats();

    const handleUserStatistics = (stats: UserStats) => {
      console.log('Received user statistics:', stats);
      setUserStats(stats);
    };

    socket.on('user statistics', handleUserStatistics);

    return () => {
      socket.off('user statistics', handleUserStatistics);
    };
  }, [socket, userName, refreshUserStats]);

  // Note: Removed automatic signout cleanup to prevent race conditions when joining games
  // Signout is now handled explicitly in the main page component when user actually signs out

  // Refresh stats when returning to lobby (e.g., after a game)
  useEffect(() => {
    // Refresh stats every 30 seconds to keep them updated
    const interval = setInterval(() => {
      refreshUserStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshUserStats]);

  const handleJoinGame = (gameId: string) => {
    console.log('Joining game:', gameId);
    if (onJoinGame) {
      onJoinGame(gameId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            Welcome to Tic-Tac-Toe Online! 🎮
          </h1>
          <p className="text-xl text-purple-200 mb-6">
            Hello, <span className="text-yellow-300 font-semibold">{userName}</span>! Ready to play?
          </p>
          
          {/* Connection Status */}
          <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
            isConnected 
              ? 'bg-green-500/20 text-green-300 border border-green-400/30' 
              : 'bg-red-500/20 text-red-300 border border-red-400/30'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-lg text-center">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl">🎮</span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Total Games</h3>
          <p className="text-2xl font-bold text-purple-300">{userStats.total_games}</p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-lg text-center">
          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl">🏆</span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Games Won</h3>
          <p className="text-2xl font-bold text-green-300">{userStats.wins}</p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-lg text-center">
          <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl">📊</span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Win Rate</h3>
          <p className="text-2xl font-bold text-yellow-300">
            {userStats.total_games > 0 ? Math.round((userStats.wins / userStats.total_games) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex space-x-1 bg-white/10 backdrop-blur-lg rounded-2xl p-1 border border-white/20">
          <button
            onClick={() => setView('games')}
            className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
              view === 'games'
                ? 'bg-gradient-to-r from-purple-600 to-pink-400 text-white shadow-lg'
                : 'text-purple-200 hover:text-white hover:bg-white/10'
            }`}
          >
            🎮 Games
          </button>
          <button
            onClick={() => setView('chat')}
            className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
              view === 'chat'
                ? 'bg-gradient-to-r from-purple-600 to-pink-400 text-white shadow-lg'
                : 'text-purple-200 hover:text-white hover:bg-white/10'
            }`}
          >
            💬 Chat
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