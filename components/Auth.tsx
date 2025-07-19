'use client';

import React, { useState, useEffect } from 'react';

interface AuthProps {
  onLogin: (username: string, password: string) => void;
  onRegister: (username: string, password: string) => void;
}

export default function Auth({ onLogin, onRegister }: AuthProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Handle client-side rendering to prevent hydration mismatches
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!username.trim()) {
      setError('Please enter a username');
      setIsLoading(false);
      return;
    }

    if (!password.trim()) {
      setError('Please enter a password');
      setIsLoading(false);
      return;
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters long');
      setIsLoading(false);
      return;
    }

    if (password.trim().length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      if (isLogin) {
        onLogin(username.trim(), password);
      } else {
        onRegister(username.trim(), password);
      }
    } catch (err) {
      setError('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setUsername('');
    setPassword('');
  };

  // Prevent hydration mismatch by not rendering form until client-side
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 border border-white border-opacity-20 relative z-10">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-600 via-pink-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl animate-pulse">
              <span className="text-3xl">🎮</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-lg">
              Welcome Back
            </h1>
            <p className="text-purple-200 text-lg font-medium">
              Sign in to continue your Tic-Tac-Toe adventure
            </p>
          </div>
          
          {/* Loading placeholder */}
          <div className="space-y-6">
            <div className="h-16 bg-white bg-opacity-5 rounded-2xl animate-pulse"></div>
            <div className="h-16 bg-white bg-opacity-5 rounded-2xl animate-pulse"></div>
            <div className="h-16 bg-white bg-opacity-10 rounded-2xl animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 border border-white border-opacity-20 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-purple-600 via-pink-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl animate-pulse">
            <span className="text-3xl">🎮</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-lg">
            {isLogin ? 'Welcome Back' : 'Join the Game'}
          </h1>
          <p className="text-purple-200 text-lg font-medium">
            {isLogin 
              ? 'Sign in to continue your Tic-Tac-Toe adventure' 
              : 'Create your account and start playing'
            }
          </p>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6" suppressHydrationWarning>
          <div>
            <label htmlFor="username" className="block text-sm font-bold text-purple-200 mb-3">
              Username
            </label>
            <div className="relative group">
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-4 bg-white bg-opacity-10 border-2 border-purple-300 border-opacity-30 rounded-2xl focus:outline-none focus:border-purple-600 text-white placeholder-pink-200 text-lg transition-all duration-300 backdrop-blur-sm group-hover:border-purple-400 group-hover:border-opacity-50"
                placeholder="Enter your username..."
                autoFocus
                disabled={isLoading}
                suppressHydrationWarning
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                <span className="text-purple-300 text-xl">👤</span>
              </div>
            </div>
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-bold text-purple-200 mb-3">
              Password
            </label>
            <div className="relative group">
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-4 bg-white bg-opacity-10 border-2 border-purple-300 border-opacity-30 rounded-2xl focus:outline-none focus:border-purple-600 text-white placeholder-pink-200 text-lg transition-all duration-300 backdrop-blur-sm group-hover:border-purple-400 group-hover:border-opacity-50"
                placeholder="Enter your password..."
                disabled={isLoading}
                suppressHydrationWarning
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                <span className="text-purple-300 text-xl">🔒</span>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-500 bg-opacity-20 border border-red-400 border-opacity-50 rounded-2xl p-4 backdrop-blur-sm">
              <div className="flex items-center">
                <span className="text-red-300 mr-3 text-xl">⚠️</span>
                <p className="text-red-200 text-sm font-medium">{error}</p>
              </div>
            </div>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 via-pink-400 to-red-500 hover:from-purple-700 hover:via-pink-500 hover:to-red-600 disabled:from-gray-500 disabled:via-gray-500 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:transform-none shadow-2xl shadow-purple-500 shadow-opacity-25 text-lg flex items-center justify-center backdrop-blur-sm"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                {isLogin ? 'Signing In...' : 'Creating Account...'}
              </>
            ) : (
              <>
                {isLogin ? '🚀 Sign In' : '🎯 Create Account'}
              </>
            )}
          </button>
        </form>
        
        {/* Toggle Mode */}
        <div className="mt-8 text-center">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-purple-300 border-opacity-30"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-transparent text-purple-200 font-medium">or</span>
            </div>
          </div>
          
          <button
            onClick={toggleMode}
            disabled={isLoading}
            className="mt-4 text-purple-300 hover:text-white text-sm font-bold transition-colors duration-300 disabled:text-gray-400 hover:scale-105 transform"
          >
            {isLogin 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Sign in"
            }
          </button>
        </div>

        {/* Features */}
        <div className="mt-8 pt-6 border-t border-purple-300 border-opacity-30">
          <div className="grid grid-cols-1 gap-4 text-sm">
            <div className="flex items-center">
              <span className="text-green-400 mr-3 text-lg">✓</span>
              <span className="text-purple-200 font-medium">Real-time multiplayer gaming</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-400 mr-3 text-lg">✓</span>
              <span className="text-purple-200 font-medium">Live chat with other players</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-400 mr-3 text-lg">✓</span>
              <span className="text-purple-200 font-medium">Free to play, no registration fees</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 