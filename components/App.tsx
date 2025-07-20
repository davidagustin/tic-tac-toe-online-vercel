'use client';

import { useEffect, useState } from 'react';
import Auth from './Auth';
import ClientOnly from './ClientOnly';
import Game from './Game';
import GameChat from './GameChat';
import Lobby from './Lobby';

interface User {
  username: string;
  password: string;
}

interface GameState {
  id: string;
  name: string;
}

export default function App() {
  const [view, setView] = useState<'lobby' | 'game'>('lobby');
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState<boolean>(true); // Force auth to show
  const [currentGame, setCurrentGame] = useState<GameState | null>(null);

  useEffect(() => {
    // Temporarily force auth to show for testing
    setShowAuth(true);

    // Check if user is already logged in
    // const savedUser = localStorage.getItem('ticTacToeUser');
    // if (savedUser) {
    //   try {
    //     const userData = JSON.parse(savedUser);
    //     setUser(userData);
    //     setIsLoggedIn(true);
    //   } catch (error) {
    //     console.error('Error parsing saved user data:', error);
    //     localStorage.removeItem('ticTacToeUser');
    //     setShowAuth(true);
    //   }
    // } else {
    //   setShowAuth(true);
    // }
  }, []);

  const handleLogin = (username: string, password: string) => {
    // For demo purposes, we'll accept any valid credentials
    // In a real app, you'd validate against a database
    const userData = { username, password };
    setUser(userData);
    setShowAuth(false);
    localStorage.setItem('ticTacToeUser', JSON.stringify(userData));
  };

  const handleRegister = (username: string, password: string) => {
    // For demo purposes, we'll treat registration the same as login
    // In a real app, you'd create a new user in the database
    const userData = { username, password };
    setUser(userData);
    setShowAuth(false);
    localStorage.setItem('ticTacToeUser', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setShowAuth(true);
    setCurrentGame(null);
    localStorage.removeItem('ticTacToeUser');
  };



  const handleBackToLobby = () => {
    setCurrentGame(null);
    setView('lobby');
  };

  const handleJoinGame = (gameId: string) => {
    // For now, we'll create a simple game state
    // In a real app, you'd fetch the game details from the server
    setCurrentGame({
      id: gameId,
      name: `Game ${gameId}`
    });
    setView('game');
  };

  // Show auth component if not logged in
  if (showAuth) {
    return (
      <ClientOnly>
        <Auth onLogin={handleLogin} onRegister={handleRegister} />
      </ClientOnly>
    );
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-gray-100">
        <div className="bg-white shadow-md border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex space-x-4">
                {currentGame && (
                  <button
                    className="px-4 py-2 rounded-md font-medium transition-colors bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                    onClick={handleBackToLobby}
                  >
                    ← Back to Lobby
                  </button>
                )}
                {!currentGame && (
                  <>
                    <button
                      className={`px-4 py-2 rounded-md font-medium transition-colors ${view === 'lobby'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      onClick={() => setView('lobby')}
                    >
                      Lobby
                    </button>
                    <button
                      className={`px-4 py-2 rounded-md font-medium transition-colors ${view === 'game'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      onClick={() => setView('game')}
                    >
                      Game
                    </button>
                  </>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">
                  Welcome, <span className="font-semibold text-blue-600">{user?.username}</span>
                </span>
                {currentGame && (
                  <span className="text-gray-600 bg-gray-100 px-3 py-1 rounded-full text-sm">
                    Playing: {currentGame.name}
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              WELCOME TO TIC-TAC-TOE
            </h1>
            <p className="text-lg text-gray-700 bg-white px-4 py-2 rounded-lg shadow-sm inline-block">
              Currently logged in as: <span className="font-semibold text-blue-600">{user?.username}</span>
            </p>
          </div>

          <div className="app">
            {currentGame ? (
              // Show game view when a game is active
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <Game
                    gameId={currentGame.id}
                    userName={user?.username || ''}
                    onBackToLobby={handleBackToLobby}
                  />
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <GameChat
                    userName={user?.username || ''}
                    gameId={currentGame.id}
                    title="Game Chat"
                    description="Chat with your opponent"
                    theme="blue"
                    icon="💬"
                  />
                </div>
              </div>
            ) : (
              // Show lobby view when no game is active
              <div className="bg-white rounded-lg shadow-md p-6">
                <Lobby
                  userName={user?.username || ''}
                  onJoinGame={handleJoinGame}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </ClientOnly>
  );
} 