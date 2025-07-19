'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Game from './Game';
import GameChatRoom from './GameChatRoom';
import Lobby from './Lobby';

const STORAGE_KEY = 'ticTacToeUserName';

export default function App() {
  const [view, setView] = useState<'lobby' | 'game'>('lobby');
  const [userName, setUserName] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState<boolean>(false);

  useEffect(() => {
    const savedUserName = localStorage.getItem(STORAGE_KEY);
    if (savedUserName) {
      setUserName(savedUserName);
      setIsLoggedIn(true);
    } else {
      setShowLoginPrompt(true);
    }
  }, []);

  const handleLogin = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (trimmedName) {
      setUserName(trimmedName);
      setIsLoggedIn(true);
      setShowLoginPrompt(false);
      localStorage.setItem(STORAGE_KEY, trimmedName);
    }
  }, []);

  const handleLogout = useCallback(() => {
    setUserName('');
    setIsLoggedIn(false);
    setShowLoginPrompt(true);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const changeView = useCallback((option: 'lobby' | 'game') => {
    setView(option);
  }, []);

  if (showLoginPrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">🎮</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to Tic-Tac-Toe
            </h1>
            <p className="text-gray-600 text-lg">
              Enter your name to start playing online
            </p>
          </div>
          <LoginForm onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 space-y-4 sm:space-y-0">
            {/* Navigation */}
            <div className="flex space-x-2 w-full sm:w-auto">
              <button
                className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
                  view === 'lobby'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
                onClick={() => changeView('lobby')}
              >
                <span className="hidden sm:inline">🏠</span> Lobby
              </button>
              <button
                className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
                  view === 'game'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
                onClick={() => changeView('game')}
              >
                <span className="hidden sm:inline">🎯</span> Game
              </button>
            </div>
            
            {/* User Info */}
            <div className="flex items-center space-x-4 w-full sm:w-auto justify-center sm:justify-end">
              <div className="flex items-center space-x-3 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2 border border-gray-200">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-gray-700 font-medium hidden sm:block">
                  {userName}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
            Tic-Tac-Toe Online
          </h1>
          <div className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-sm border border-gray-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-gray-700 font-medium">
              Playing as: <span className="font-semibold text-blue-600">{userName}</span>
            </span>
          </div>
        </div>

        <div className="app">
          {view === 'game' ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 lg:p-8 border border-gray-100">
                <Game />
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 lg:p-8 border border-gray-100">
                <GameChatRoom userName={userName} />
              </div>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 lg:p-8 border border-gray-100 max-w-4xl mx-auto">
              <Lobby userName={userName} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Login form component
function LoginForm({ onLogin }: { onLogin: (name: string) => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      setError('Please enter your name');
      return;
    }
    if (trimmedName.length < 2) {
      setError('Name must be at least 2 characters long');
      return;
    }
    setError('');
    onLogin(trimmedName);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-3">
          Your Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400 text-lg transition-all duration-200"
          placeholder="Enter your name..."
          autoFocus
        />
        {error && (
          <p className="text-red-500 text-sm mt-2 flex items-center">
            <span className="mr-1">⚠️</span>
            {error}
          </p>
        )}
      </div>
      <button
        type="submit"
        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg shadow-blue-500/25 text-lg"
      >
        🚀 Start Playing
      </button>
    </form>
  );
} 