'use client';

import Game from '@/components/Game';
import Lobby from '@/components/Lobby';
import GameManager from '@/components/GameManager';
import { useTrpcGame } from '@/hooks/useTrpcGame';
import React, { useEffect, useState } from 'react';

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

// Error boundary component for safer tRPC usage
class TrpcErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('tRPC Error Boundary caught an error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('tRPC Error Boundary error details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs bg-red-500/20 text-red-300 border border-red-400/30">
          <div className="w-2 h-2 rounded-full bg-red-400"></div>
          <span>Offline mode</span>
        </div>
      );
    }

    return this.props.children;
  }
}

// Safe tRPC hook with fallback
function useSafeTrpc() {
  try {
    // Use the real tRPC hook
    return useTrpcGame();
  } catch (error) {
    console.error('tRPC hook error:', error);

    // Return fallback values
    return {
      isConnected: false,
      clearGames: () => console.log('🧹 Clearing games (fallback)'),
    };
  }
}

interface User {
  username: string;
  password: string;
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

  // Use safe tRPC hook with error handling
  const { isConnected, clearGames } = useSafeTrpc();

  // Monitor currentGame state changes
  useEffect(() => {
    console.log('🎮 Main Page: currentGame state changed:', currentGame);
  }, [currentGame]);

  // Simplified cleanup for debugging  
  useEffect(() => {
    (window as Window & { clearAllGames?: () => Promise<void> }).clearAllGames = async () => {
      console.log('🧹 Global cleanup triggered...');
      try {
        clearGames();
        localStorage.removeItem('ticTacToeUser');
        localStorage.removeItem('currentUser');
        sessionStorage.clear();
        window.location.reload();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    };
  }, [clearGames]);

  // Load user from localStorage on component mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('ticTacToeUser');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setShowLobby(true);
      }
    } catch (error) {
      console.error('Error parsing saved user:', error);
      localStorage.removeItem('ticTacToeUser');
    }
  }, []);

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

  const handleSignOut = () => {
    setUser(null);
    setShowLobby(false);
    setCurrentGame(null);
    localStorage.removeItem('ticTacToeUser');

    // Clear form
    setUsername('');
    setPassword('');
    setError('');
    setSuccess('');
  };

  const handleBackToLobby = () => {
    setCurrentGame(null);
  };

  const handleJoinGame = (gameId: string) => {
    console.log('🎮 Main Page: handleJoinGame called with gameId:', gameId);
    console.log('🎮 Main Page: user exists:', !!user);
    if (user) {
      console.log('🎮 Main Page: Setting currentGame state...');
      setCurrentGame({ gameId, userName: user.username });
      setShowLobby(false);
      console.log('🎮 Main Page: State updated - currentGame set to:', { gameId, userName: user.username });
    } else {
      console.log('⚠️ Main Page: No user found, cannot join game');
    }
  };

  // Expose handleJoinGame globally for testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).testJoinGame = handleJoinGame;
    }
  }, [user]);

  // If user is authenticated and lobby should be shown, display the lobby or game
  if (user && showLobby) {
    console.log('🎮 Main Page: Rendering decision - currentGame:', currentGame, 'user:', user.username);
    // If there's an active game, show the game component
    if (currentGame) {
      return (
        <ClientOnly>
          <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 animate-fadeIn">
            {/* Header with user info and sign out */}
            <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
              <div className="max-w-7xl mx-auto mobile-padding">
                <div className="mobile-header py-3 sm:py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-600 to-pink-400 rounded-full flex items-center justify-center">
                      <span className="text-white text-base sm:text-lg">🎮</span>
                    </div>
                    <div>
                      <h1 className="text-lg sm:text-xl font-bold text-white">Tic-Tac-Toe Online</h1>
                      <p className="text-purple-200 text-xs sm:text-sm">Welcome, {user.username}!</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="btn-secondary text-sm px-3 py-2 sm:px-4 sm:py-2"
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
        </ClientOnly>
      );
    }

    // Otherwise show the lobby
    return (
      <ClientOnly>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 animate-fadeIn">
          {/* Header with user info and sign out */}
          <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
            <div className="max-w-7xl mx-auto mobile-padding">
              <div className="mobile-header py-3 sm:py-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-600 to-pink-400 rounded-full flex items-center justify-center">
                    <span className="text-white text-base sm:text-lg">🎮</span>
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-xl font-bold text-white">Tic-Tac-Toe Online</h1>
                    <p className="text-purple-200 text-xs sm:text-sm">Welcome, {user.username}!</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="btn-secondary text-sm px-3 py-2 sm:px-4 sm:py-2"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Lobby Content */}
          <div className="max-w-7xl mx-auto mobile-padding py-4 sm:py-8">
            <GameManager userName={user.username} onJoinGame={handleJoinGame} />
          </div>
        </div>
      </ClientOnly>
    );
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center mobile-padding">
        {/* Animated Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-48 h-48 sm:w-72 sm:h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-48 h-48 sm:w-72 sm:h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-48 h-48 sm:w-72 sm:h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        {/* Glass Morphism Card */}
        <div className="relative z-10 w-full max-w-md">
          <div className="card">
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-purple-600 to-pink-400 rounded-full mb-3 sm:mb-4">
                <span className="text-xl sm:text-2xl">🎮</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h1>
              <p className="text-purple-200 mobile-text">
                {isLogin
                  ? 'Sign in to continue your Tic-Tac-Toe adventure'
                  : 'Join the Tic-Tac-Toe community'
                }
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-500 bg-opacity-20 border border-red-400 border-opacity-30 rounded-2xl text-red-200 text-center mobile-text">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-500 bg-opacity-20 border border-green-400 border-opacity-30 rounded-2xl text-green-200 text-center mobile-text">
                {success}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-purple-200 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-primary input-mobile"
                  placeholder="Enter your username..."
                  required
                  autoComplete="username"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-purple-200 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-primary input-mobile"
                  placeholder="Enter your password..."
                  required
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full"
                data-testid="submit-button"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
                  </div>
                ) : (
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                )}
              </button>

              <div className="text-center">
                <span className="text-purple-200 text-sm">or</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setSuccess('');
                }}
                className="btn-secondary w-full mobile-text"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </form>

            {/* Features List for Mobile */}
            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white border-opacity-20">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="text-green-400 text-base sm:text-lg">✅</span>
                  <span className="text-purple-200 text-sm sm:text-base">Real-time multiplayer gaming</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-400 text-base sm:text-lg">✅</span>
                  <span className="text-purple-200 text-sm sm:text-base">Live chat with other players</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-400 text-base sm:text-lg">✅</span>
                  <span className="text-purple-200 text-sm sm:text-base">Free to play, mobile-friendly</span>
                </div>
              </div>
            </div>

            {/* Connection Status with Error Boundary */}
            <div className="mt-4 sm:mt-6 text-center">
              <TrpcErrorBoundary>
                <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${isConnected
                  ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                  : 'bg-red-500/20 text-red-300 border border-red-400/30'
                  }`}>
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span>{isConnected ? 'Real-time connected' : 'Offline mode'}</span>
                </div>
              </TrpcErrorBoundary>
            </div>
          </div>
        </div>
      </div>
    </ClientOnly>
  );
}
