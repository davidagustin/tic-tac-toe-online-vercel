'use client';

import { usePusher } from '@/hooks/usePusher';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface GameProps {
  gameId: string;
  userName: string;
  onBackToLobby: () => void;
}

type BoardState = (string | null)[][];

const INITIAL_BOARD: BoardState = [
  [null, null, null],
  [null, null, null],
  [null, null, null]
];

export default function Game({ gameId, userName, onBackToLobby }: GameProps) {
  const { isConnected, currentGame, joinGame, leaveGame } = usePusher();
  const [board, setBoard] = useState<BoardState>(INITIAL_BOARD);
  const [gameMessage, setGameMessage] = useState<string>("");
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showTimeoutMessage, setShowTimeoutMessage] = useState<boolean>(false);

  console.log('🎮 Game Component: Mounted with gameId:', gameId, 'userName:', userName);
  console.log('🎮 Game Component: Current game from Pusher:', currentGame);
  console.log('🎮 Game Component: isConnected:', isConnected);
  console.log('🎮 Game Component: Browser:', typeof window !== 'undefined' ? navigator.userAgent : 'Server');

  // Join game channel when component mounts
  useEffect(() => {
    console.log('🎮 Game Component: useEffect triggered - isConnected:', isConnected, 'gameId:', gameId);

    if (isConnected && gameId) {
      console.log('🎮 Game Component: Attempting to join game...');
      joinGame(gameId, userName).then(() => {
        console.log('✅ Game Component: Successfully called joinGame');
      }).catch(error => {
        console.error('❌ Game Component: Error joining game:', error);
        setHasError(true);
      });
    } else {
      console.log('⚠️ Game Component: Cannot join game - isConnected:', isConnected, 'gameId:', gameId);
    }
  }, [isConnected, gameId, userName, joinGame]);

  // Update local state when game data changes
  useEffect(() => {
    console.log('🎮 Game Component: Game data update effect - currentGame:', currentGame, 'gameId:', gameId);
    console.log('🎮 Game Component: Current game players:', currentGame?.players);
    console.log('🎮 Game Component: Current game status:', currentGame?.status);
    console.log('🎮 Game Component: Current game currentPlayer:', currentGame?.currentPlayer);
    console.log('🎮 Game Component: Current user:', userName);

    if (currentGame && currentGame.id === gameId) {
      console.log('✅ Game Component: Game data matched, updating board and UI');

      // Convert flat board array to 2D array
      const newBoard: BoardState = [
        [currentGame.board[0], currentGame.board[1], currentGame.board[2]],
        [currentGame.board[3], currentGame.board[4], currentGame.board[5]],
        [currentGame.board[6], currentGame.board[7], currentGame.board[8]]
      ];
      setBoard(newBoard);

      // Update game message based on status
      if (currentGame.status === 'finished') {
        if (currentGame.winner) {
          // Get the winner's username based on their symbol
          const winnerIndex = currentGame.winner === 'X' ? 0 : 1;
          const winnerName = currentGame.players[winnerIndex] || currentGame.winner;
          setGameMessage(`${winnerName} wins!`);
        } else {
          setGameMessage("It's a draw!");
        }
      } else if (currentGame.status === 'playing') {
        const currentPlayerName = currentGame.currentPlayer === 'X'
          ? currentGame.players[0]
          : currentGame.players[1];
        setGameMessage(`${currentPlayerName}'s turn`);
      } else {
        setGameMessage('Waiting for players...');
      }
    } else {
      console.log('⚠️ Game Component: Game data not matched or missing');
      console.log('⚠️ Game Component: currentGame?.id:', currentGame?.id);
      console.log('⚠️ Game Component: gameId:', gameId);
      console.log('⚠️ Game Component: currentGame exists:', !!currentGame);
    }
  }, [currentGame, gameId, userName]);

  // Handle timeout for loading state - only based on game data, not connection
  useEffect(() => {
    if (!currentGame) {
      const isChrome = typeof window !== 'undefined' && navigator.userAgent.includes('Chrome');
      const timeoutDuration = isChrome ? 45000 : 30000; // Longer timeout for Chrome

      console.log(`🎮 Game Component: Setting loading timeout for ${timeoutDuration}ms (Chrome: ${isChrome})`);

      const timeout = setTimeout(() => {
        console.log('🎮 Game Component: Loading timeout reached');
        setShowTimeoutMessage(true);
      }, timeoutDuration);

      return () => clearTimeout(timeout);
    } else {
      setShowTimeoutMessage(false);
    }
  }, [currentGame]); // Removed isConnected dependency

  // Memoized computed values
  const isGameEnded = useMemo(() =>
    currentGame?.status === 'finished',
    [currentGame?.status]
  );

  const isMyTurn = useMemo(() => {
    if (!currentGame || currentGame.status !== 'playing') return false;
    const playerIndex = currentGame.players.indexOf(userName);
    return playerIndex === 0 ? currentGame.currentPlayer === 'X' : currentGame.currentPlayer === 'O';
  }, [currentGame, userName]);

  // Get current player name
  const getCurrentPlayerName = useMemo(() => {
    if (!currentGame || !currentGame.currentPlayer) return 'Unknown';
    const playerIndex = currentGame.currentPlayer === 'X' ? 0 : 1;
    return currentGame.players[playerIndex] || 'Unknown';
  }, [currentGame]);

  // Get my player symbol
  const getMyPlayerSymbol = useMemo(() => {
    if (!currentGame) return null;
    const playerIndex = currentGame.players.indexOf(userName);
    return playerIndex === 0 ? 'X' : 'O';
  }, [currentGame, userName]);

  const handleLeaveGame = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Game component: leaving game');
      leaveGame();
      onBackToLobby();
    } catch (error) {
      console.error('Error leaving game:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [leaveGame, onBackToLobby]);

  const handleCellClick = useCallback(async (y: number, x: number) => {
    console.log('🎮 Game Component: Cell clicked at position:', y, x);
    console.log('🎮 Game Component: isConnected:', isConnected);
    console.log('🎮 Game Component: isGameEnded:', isGameEnded);
    console.log('🎮 Game Component: board[y][x]:', board[y][x]);
    console.log('🎮 Game Component: isMyTurn:', isMyTurn);
    console.log('🎮 Game Component: currentGame?.status:', currentGame?.status);

    if (!isConnected || isGameEnded || board[y][x] !== null || !isMyTurn || currentGame?.status !== 'playing') {
      console.log('🎮 Game Component: Move blocked - conditions not met');
      return;
    }

    try {
      setIsLoading(true);
      const index = y * 3 + x;
      const playerSymbol = getMyPlayerSymbol;

      console.log('🎮 Game Component: Making move - index:', index, 'playerSymbol:', playerSymbol);

      if (!playerSymbol) {
        console.error('Player symbol not found');
        return;
      }

      console.log('🎮 Game Component: Calling move API...');
      const response = await fetch('/api/game/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId: gameId,
          index: index,
          player: playerSymbol,
        }),
      });

      const data = await response.json();
      console.log('🎮 Game Component: Move API response status:', response.status);
      console.log('🎮 Game Component: Move API response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to make move');
      }

      console.log('Move made successfully:', data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to make move';
      console.error('Error making move:', errorMessage);
      setHasError(true);
      alert(errorMessage || 'Failed to make move. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, board, isGameEnded, isMyTurn, currentGame?.status, getMyPlayerSymbol, gameId]);

  // Handle errors
  if (hasError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-lg text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-4">Game Error</h2>
          <p className="text-purple-200 mb-6">Something went wrong with the game. Please try again.</p>
          <button
            onClick={onBackToLobby}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-400 text-white rounded-xl font-medium hover:from-purple-700 hover:to-pink-500 transition-all duration-300"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  // Show loading state only if game data is not available
  // Note: We don't require isConnected for the game to work, as the API can work without Pusher
  if (!currentGame) {

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-lg text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading Game...</h2>
          <p className="text-purple-200">
            {showTimeoutMessage
              ? "Connection timeout. Please check your connection and try again."
              : "Connecting to game server"
            }
          </p>

          {/* Connection status indicator */}
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mt-4 ${isConnected
            ? 'bg-green-500/20 text-green-300 border border-green-400/30'
            : 'bg-red-500/20 text-red-300 border border-red-400/30'
            }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
            {isConnected ? 'Connected to real-time' : 'Real-time disconnected (API still works)'}
          </div>

          {showTimeoutMessage && (
            <button
              onClick={onBackToLobby}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-400 text-white rounded-xl font-medium hover:from-purple-700 hover:to-pink-500 transition-all duration-300"
            >
              Back to Lobby
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Tic-Tac-Toe Game
          </h1>
          <p className="text-xl text-purple-200 mb-4">
            Game: <span className="text-yellow-300 font-semibold">{currentGame.name}</span>
          </p>

          {/* Game Status */}
          <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-white/10 backdrop-blur-lg border border-white/20">
            <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        {/* Game Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-lg text-center">
            <h3 className="text-lg font-semibold text-white mb-2">Players</h3>
            <div className="space-y-2">
              {currentGame.players.map((player, index) => (
                <div key={player} className="flex items-center justify-center space-x-2">
                  <span className="text-purple-300">{index === 0 ? 'X' : 'O'}:</span>
                  <span className="text-white font-medium">{player}</span>
                  {player === userName && (
                    <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded-full">You</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-lg text-center">
            <h3 className="text-lg font-semibold text-white mb-2">Current Turn</h3>
            <p className="text-2xl font-bold text-purple-300">{getCurrentPlayerName}</p>
            {isMyTurn && currentGame.status === 'playing' && (
              <p className="text-sm text-green-400 mt-1">Your turn!</p>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-lg text-center">
            <h3 className="text-lg font-semibold text-white mb-2">Game Status</h3>
            <p className="text-2xl font-bold text-purple-300 capitalize">{currentGame.status}</p>
            {gameMessage && (
              <p className="text-sm text-purple-200 mt-1">{gameMessage}</p>
            )}
          </div>
        </div>

        {/* Game Board */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-lg max-w-md mx-auto mb-8">
          <div className="grid grid-cols-3 gap-2">
            {board.map((row, y) =>
              row.map((cell, x) => (
                <button
                  key={`${y}-${x}`}
                  onClick={() => handleCellClick(y, x)}
                  disabled={isLoading || cell !== null || !isMyTurn || isGameEnded || currentGame.status !== 'playing'}
                  className="w-20 h-20 bg-white/10 border border-white/20 rounded-xl text-3xl font-bold text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
                >
                  {cell}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Game Controls */}
        <div className="text-center space-x-4">
          <button
            onClick={handleLeaveGame}
            disabled={isLoading}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-500 text-white rounded-xl font-medium hover:from-red-700 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          >
            {isLoading ? 'Leaving...' : 'Leave Game'}
          </button>
        </div>
      </div>
    </div>
  );
} 