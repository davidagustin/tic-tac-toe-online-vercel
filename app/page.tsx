'use client';

import React, { useState, useEffect } from 'react';
import Lobby from '@/components/Lobby';
import Game from '@/components/Game';
import { usePusher } from '@/hooks/usePusher';
import { PusherDebug } from '@/components/PusherDebug';
import { PusherTest } from '@/components/PusherTest';

// Client-only wrapper to prevent hydration issues
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
}

interface User {
  id: number;
  username: string;
  createdAt: string;
}

export default function Home() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [showLobby, setShowLobby] = useState(false);
  const [currentGame, setCurrentGame] = useState<{ gameId: string; userName: string } | null>(null);
  const { isConnected, leaveGame, isInitializing, lastError } = usePusher();

  // Load user from localStorage on component mount
  useEffect(() => {
    const savedUser = localStorage.getItem('ticTacToeUser');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setShowLobby(true);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('ticTacToeUser');
      }
    }
  }, []);

  // Listen for game removal events
  useEffect(() => {
    if (!isConnected) return;

    const handleGameRemoved = (removedGameId: string) => {
      console.log('Main page: game removed event received for game:', removedGameId);
      console.log('Main page: current game state:', currentGame);
      if (currentGame && currentGame.gameId === removedGameId) {
        console.log('Main page: current game was removed, returning to lobby');
        setCurrentGame(null);
      } else {
        console.log('Main page: game removed but not current game, or no current game');
      }
    };

    const handlePusherError = (error: { message: string }) => {
      console.error('Main page: Pusher error:', error);
      if (error.message === 'Game not found' && currentGame) {
        console.log('Main page: game not found error, returning to lobby');
        setCurrentGame(null);
      }
    };

    // Note: These events would be handled by the Pusher hook
    // The actual event handling is done in the usePusher hook

    return () => {
      // Cleanup is handled by the Pusher hook
    };
  }, [isConnected, currentGame]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        
        // Save user to localStorage for persistence
        localStorage.setItem('ticTacToeUser', JSON.stringify(data.user));
        
        // Clear form
        setUsername('');
        setPassword('');
        
        // Show success message
        setSuccess(isLogin ? 'Successfully signed in!' : 'Account created successfully!');
        
        // Show lobby after a brief delay for better UX
        setTimeout(() => {
          setShowLobby(true);
        }, 1000);
      } else {
        setError(data.error || 'An error occurred');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
  };

  const handleJoinGame = (gameId: string) => {
    if (user) {
      console.log('Joining game:', gameId, 'as user:', user.username);
      setCurrentGame({ gameId, userName: user.username });
    }
  };

  const handleBackToLobby = () => {
    console.log('Returning to lobby');
    setCurrentGame(null);
  };

  const handleSignOut = async () => {
    try {
      // If user is in a game, leave the game first
      if (currentGame && isConnected) {
        console.log('Leaving game before sign out:', currentGame.gameId);
        // Game leaving is handled by the Game component
      }

      // Notify server to clean up user's games and connections
      await fetch('/api/clear-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: user?.username,
          action: 'signout'
        }),
      });
    } catch (error) {
      console.error('Error clearing auth:', error);
    }
    
    // Clear local state
    setUser(null);
    setShowLobby(false);
    setCurrentGame(null);
    setSuccess('');
    setError('');
    
    // Clear localStorage
    localStorage.removeItem('ticTacToeUser');
  };

  // If user is authenticated and lobby should be shown, display the lobby or game
  if (user && showLobby) {
    // If there's an active game, show the game component
    if (currentGame) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 animate-fadeIn">
          {/* Header with user info and sign out */}
          <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-400 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">🎮</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white">Tic-Tac-Toe Online</h1>
                    <p className="text-purple-200 text-sm">Welcome, {user.username}!</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="bg-white/10 backdrop-blur-sm text-white font-medium py-2 px-4 rounded-xl border border-white/20 transition-all duration-300 hover:bg-white/20 hover:scale-105"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Game Content */}
          <Game 
            gameId={currentGame.gameId} 
            userName={currentGame.userName} 
            onBackToLobby={handleBackToLobby} 
          />
        </div>
      );
    }

    // Otherwise show the lobby
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 animate-fadeIn">
        {/* Header with user info and sign out */}
        <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-400 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg">🎮</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Tic-Tac-Toe Online</h1>
                  <p className="text-purple-200 text-sm">Welcome, {user.username}!</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="bg-white/10 backdrop-blur-sm text-white font-medium py-2 px-4 rounded-xl border border-white/20 transition-all duration-300 hover:bg-white/20 hover:scale-105"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Lobby Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Lobby userName={user.username} onJoinGame={handleJoinGame} />
        </div>
        
        {/* Debug Component */}
        {process.env.NODE_ENV === 'development' && (
          <>
                        <PusherDebug 
              isConnected={isConnected} 
              isInitializing={isInitializing} 
              lastError={lastError} 
            />
            
            {/* Test Component */}
            <PusherTest />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Glass Morphism Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white border-opacity-20 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-400 rounded-full mb-4">
              <span className="text-2xl">🎮</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-purple-200">
              {isLogin 
                ? 'Sign in to continue your Tic-Tac-Toe adventure'
                : 'Join the Tic-Tac-Toe community'
              }
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500 bg-opacity-20 border border-red-400 border-opacity-30 rounded-2xl text-red-200 text-center">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-500 bg-opacity-20 border border-green-400 border-opacity-30 rounded-2xl text-green-200 text-center">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" suppressHydrationWarning>
            <ClientOnly>
              <div className="space-y-6">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-white mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="username"
                      name="username"
                      data-testid="username-input"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-4 bg-white bg-opacity-10 border-2 border-purple-300 border-opacity-30 rounded-2xl focus:outline-none focus:border-purple-600 text-white placeholder-pink-200 text-lg transition-all duration-300 backdrop-blur-sm"
                      placeholder="Enter your username"
                      autoFocus
                      disabled={isLoading}
                      required
                      suppressHydrationWarning
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                      <span className="text-purple-300 text-xl">👤</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      id="password"
                      name="password"
                      data-testid="password-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-4 bg-white bg-opacity-10 border-2 border-purple-300 border-opacity-30 rounded-2xl focus:outline-none focus:border-purple-600 text-white placeholder-pink-200 text-lg transition-all duration-300 backdrop-blur-sm"
                      placeholder="Enter your password"
                      disabled={isLoading}
                      required
                      minLength={isLogin ? undefined : 6}
                      suppressHydrationWarning
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                      <span className="text-purple-300 text-xl">🔒</span>
                    </div>
                  </div>
                  {!isLogin && (
                    <p className="text-purple-200 text-sm mt-1">Password must be at least 6 characters</p>
                  )}
                </div>
              </div>
            </ClientOnly>

            <button
              type="submit"
              data-testid="submit-button"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 via-pink-400 to-red-500 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 hover:from-purple-700 hover:via-pink-500 hover:to-red-600 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span className="text-xl">🚀</span>
                  <span>{isLogin ? 'Sign In' : 'Sign Up'}</span>
                </>
              )}
            </button>

            <div className="text-center">
              <span className="text-purple-200">or</span>
            </div>

            <button
              type="button"
              onClick={handleToggleMode}
              disabled={isLoading}
              className="w-full bg-white bg-opacity-10 backdrop-blur-sm text-white font-medium py-3 px-6 rounded-2xl border border-white border-opacity-20 transition-all duration-300 hover:bg-white hover:bg-opacity-20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLogin ? 'Create New Account' : 'Already have an account? Sign In'}
            </button>


          </form>
        </div>
      </div>
    </div>
  );
}
