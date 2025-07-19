'use client';

import React, { useState } from 'react';
import ChatRoom from './ChatRoom';
import GameManager from './GameManager';
import Game from './Game';

interface LobbyProps {
  userName: string;
}

export default function Lobby({ userName }: LobbyProps) {
  const [activeTab, setActiveTab] = useState<'games' | 'chat'>('games');
  const [currentGame, setCurrentGame] = useState<{ id: string; name: string } | null>(null);

  const handleJoinGame = (gameId: string) => {
    console.log('Lobby: handleJoinGame called with gameId:', gameId);
    setCurrentGame({ id: gameId, name: `Game ${gameId}` });
  };

  const handleBackToLobby = () => {
    setCurrentGame(null);
  };

  // If user is in a game, show the game component
  if (currentGame) {
    return (
      <Game 
        gameId={currentGame.id} 
        userName={userName} 
        onBackToLobby={handleBackToLobby}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-400 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-2xl">🏠</span>
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
            Game Lobby
          </h2>
        </div>
        <p className="text-purple-200 text-lg max-w-2xl mx-auto leading-relaxed">
          Welcome to the ultimate Tic-Tac-Toe experience! Create games, join matches, and chat with players from around the world.
        </p>
        
        {/* User Status Badge */}
        <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20 shadow-lg">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-white font-medium">
            Playing as: <span className="font-semibold text-green-300">{userName}</span>
          </span>
        </div>
      </div>

      {/* Enhanced Tab Navigation */}
      <div className="flex justify-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2 border border-white/20 shadow-lg">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('games')}
              className={`relative px-8 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 cursor-pointer ${
                activeTab === 'games'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-400 text-white shadow-lg shadow-purple-600/25'
                  : 'text-purple-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex items-center space-x-2">
                <span className="text-lg">🎯</span>
                <span>Games</span>
              </span>
              {activeTab === 'games' && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600 to-pink-400 opacity-0 animate-pulse"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`relative px-8 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25'
                  : 'text-purple-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex items-center space-x-2">
                <span className="text-lg">💬</span>
                <span>Chat</span>
              </span>
              {activeTab === 'chat' && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 opacity-0 animate-pulse"></div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Content Area */}
      <div className="min-h-[700px] relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-3xl -z-10"></div>
        
        {/* Content Container */}
        <div className="relative bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-xl">
          <div className={`transition-all duration-500 ease-in-out ${
            activeTab === 'games' ? 'opacity-100 translate-y-0 relative' : 'opacity-0 translate-y-4 absolute inset-0 pointer-events-none'
          }`}>
            {activeTab === 'games' && (
              <div className="animate-fadeIn">
                <GameManager userName={userName} onJoinGame={handleJoinGame} />
              </div>
            )}
          </div>
          
          <div className={`transition-all duration-500 ease-in-out ${
            activeTab === 'chat' ? 'opacity-100 translate-y-0 relative' : 'opacity-0 translate-y-4 absolute inset-0 pointer-events-none'
          }`}>
            {activeTab === 'chat' && (
              <div className="animate-fadeIn">
                <ChatRoom
                  userName={userName}
                  title="Game Lobby"
                  description="Chat with other players before starting a game"
                  theme="blue"
                  icon="🏠"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-lg text-center">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl">🎮</span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Active Games</h3>
          <p className="text-2xl font-bold text-purple-300">0</p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-lg text-center">
          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl">👥</span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Online Players</h3>
          <p className="text-2xl font-bold text-green-300">1</p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-lg text-center">
          <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl">🏆</span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Games Won</h3>
          <p className="text-2xl font-bold text-yellow-300">0</p>
        </div>
      </div>
    </div>
  );
} 