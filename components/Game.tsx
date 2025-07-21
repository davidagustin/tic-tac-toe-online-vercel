'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useTrpcGame } from '@/hooks/useTrpcGame';

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
  const { 
    isConnected, 
    currentGame, 
    joinGame, 
    leaveGame, 
    subscribeToLobby, 
    refreshCurrentGame, 
    refreshChatMessages, 
    isRefreshing 
  } = useTrpcGame();
  const [board, setBoard] = useState<BoardState>(INITIAL_BOARD);
  const [gameMessage, setGameMessage] = useState<string>("");
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showTimeoutMessage, setShowTimeoutMessage] = useState<boolean>(false);
  const [hasJoinedGame, setHasJoinedGame] = useState<boolean>(false);
  const [joinAttempted, setJoinAttempted] = useState<boolean>(false);
  const joinAttemptRef = useRef<boolean>(false);

  console.log('🎮 Game Component: Mounted with gameId:', gameId, 'userName:', userName);
  console.log('🎮 Game Component: Current game from Pusher:', currentGame);
  console.log('🎮 Game Component: isConnected:', isConnected);
  console.log('🎮 Game Component: Browser:', typeof window !== 'undefined' ? navigator.userAgent : 'Server');

  // Handle page unload - leave game
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (gameId && userName && hasJoinedGame) {
        console.log('🚪 Page unloading - leaving game');
        try {
          await fetch('/api/game/leave', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId, userName }),
          });
        } catch (error) {
          console.error('Error leaving game on unload:', error);
        }
      }
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden' && gameId && userName && hasJoinedGame) {
        console.log('🚪 Page hidden - leaving game');
        try {
          await fetch('/api/game/leave', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId, userName }),
          });
        } catch (error) {
          console.error('Error leaving game on visibility change:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [gameId, userName, hasJoinedGame]);

  // Initialize data when component mounts
  useEffect(() => {
    console.log('🎮 Game Component: useEffect triggered - isConnected:', isConnected, 'gameId:', gameId, 'joinAttempted:', joinAttempted, 'joinAttemptRef:', joinAttemptRef.current);

    // Initialize data with the gameId
    if (isConnected && gameId) {
      console.log('🎮 Game Component: Initializing data with gameId:', gameId);
      subscribeToLobby(gameId);
    }

    if (isConnected && gameId && !joinAttempted && !joinAttemptRef.current) {
      console.log('🎮 Game Component: Checking if user is already in game...');
      
      // Check if user is already in the game
      const isAlreadyInGame = currentGame?.players?.includes(userName);
      console.log('🎮 Game Component: User already in game:', isAlreadyInGame);
      
      if (isAlreadyInGame) {
        console.log('🎮 Game Component: User already in game, skipping join attempt');
        setHasJoinedGame(true);
        setJoinAttempted(true);
        joinAttemptRef.current = true;
        return;
      }
      
      console.log('🎮 Game Component: Attempting to join game...');
      setJoinAttempted(true);
      joinAttemptRef.current = true;
      
      // Add debouncing to prevent rapid calls
      const timeoutId = setTimeout(async () => {
        try {
          await joinGame(gameId, userName);
          console.log('✅ Game Component: Successfully called joinGame');
          setHasJoinedGame(true);
        } catch (error) {
          console.error('❌ Game Component: Error joining game:', error);
          setHasError(true);
          setJoinAttempted(false); // Reset flag on error so we can retry
          joinAttemptRef.current = false; // Reset ref on error
          
          // Retry after a delay if it's a rate limit or network error
          if (error instanceof Error && (error.message.includes('Rate limited') || error.message.includes('Network'))) {
            console.log('🔄 Game Component: Retrying join game after error...');
            setTimeout(() => {
              setJoinAttempted(false);
              joinAttemptRef.current = false;
            }, 2000);
          }
        }
      }, 1000); // 1 second debounce

      return () => clearTimeout(timeoutId);
    } else {
      console.log('⚠️ Game Component: Cannot join game - isConnected:', isConnected, 'gameId:', gameId, 'joinAttempted:', joinAttempted, 'joinAttemptRef:', joinAttemptRef.current);
    }
  }, [isConnected, gameId, userName, joinAttempted, subscribeToLobby, joinGame, currentGame?.players]);

  // Cleanup function to leave game when component unmounts
  useEffect(() => {
    return () => {
      if (gameId && userName && hasJoinedGame) {
        console.log('🚪 Component unmounting - leaving game automatically');
        // Use a synchronous approach for cleanup to ensure it runs
        fetch('/api/game/leave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId, userName }),
        }).catch(error => {
          console.error('Error leaving game on unmount:', error);
        });
      }
    };
  }, [gameId, userName, hasJoinedGame]);

  // Update local state when game data changes
  useEffect(() => {
    console.log('🎮 Game Component: Game data update effect - currentGame:', currentGame, 'gameId:', gameId);
    console.log('🎮 Game Component: Current game players:', currentGame?.players);
    console.log('🎮 Game Component: Current game status:', currentGame?.status);
    console.log('🎮 Game Component: Current game currentPlayer:', currentGame?.currentPlayer);
    console.log('🎮 Game Component: Current user:', userName);
    console.log('🎮 Game Component: Game data update effect - hasJoinedGame:', hasJoinedGame, 'joinAttempted:', joinAttempted);

    if (currentGame && currentGame.id === gameId) {
      console.log('✅ Game Component: Game data matched, updating board and UI');

      // Convert flat board array to 2D array - with safety check
      if (currentGame.board && Array.isArray(currentGame.board) && currentGame.board.length === 9) {
        const newBoard: BoardState = [
          [currentGame.board[0] || null, currentGame.board[1] || null, currentGame.board[2] || null],
          [currentGame.board[3] || null, currentGame.board[4] || null, currentGame.board[5] || null],
          [currentGame.board[6] || null, currentGame.board[7] || null, currentGame.board[8] || null]
        ];
        setBoard(newBoard);
      }

      // Update game message based on status
      if (currentGame.status === 'finished') {
        if (currentGame.winner) {
          // Get the winner's username based on their symbol
          const winnerIndex = currentGame.winner === 'X' ? 0 : 1;
          const winnerName = (currentGame.players && currentGame.players[winnerIndex]) || currentGame.winner;
          setGameMessage(`${winnerName} wins!`);
        } else {
          setGameMessage("It's a draw!");
        }
      } else if (currentGame.status === 'playing') {
        // currentPlayer is the username, not the symbol
        const currentPlayerName = currentGame.currentPlayer || 'Unknown Player';
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
  }, [currentGame, gameId, userName, hasJoinedGame, joinAttempted, currentGame?.players]); // Added currentGame?.players to dependencies

  // Handle timeout for loading state - only based on game data, not connection
  useEffect(() => {
    if (!currentGame) {
      const isChrome = typeof window !== 'undefined' && navigator.userAgent.includes('Chrome');
      const timeoutDuration = isChrome ? 30000 : 20000; // Reduced timeout for faster feedback

      console.log(`🎮 Game Component: Setting loading timeout for ${timeoutDuration}ms (Chrome: ${isChrome})`);
      console.log('🎮 Game Component: Current state - hasJoinedGame:', hasJoinedGame, 'joinAttempted:', joinAttempted, 'joinAttemptRef:', joinAttemptRef.current);

      const timeout = setTimeout(() => {
        console.log('🎮 Game Component: Loading timeout reached');
        setShowTimeoutMessage(true);
        // Reset flags to allow retry
        setJoinAttempted(false);
        joinAttemptRef.current = false;
      }, timeoutDuration);

      return () => clearTimeout(timeout);
    } else {
      setShowTimeoutMessage(false);
      console.log('✅ Game Component: Game loaded successfully, clearing timeout');
    }
  }, [currentGame, hasJoinedGame, joinAttempted]); // Added dependencies for better tracking

  // Memoized computed values
  const isGameEnded = useMemo(() =>
    currentGame?.status === 'finished',
    [currentGame?.status]
  );

  const isMyTurn = useMemo(() => {
    if (!currentGame || isGameEnded) return false;
    return currentGame.currentPlayer === userName;
  }, [currentGame?.currentPlayer, currentGame?.status, userName, isGameEnded]);

  const getMyPlayerSymbol = useMemo(() => {
    if (!currentGame?.players) return null;
    const playerIndex = currentGame.players.indexOf(userName);
    return playerIndex === 0 ? 'X' : playerIndex === 1 ? 'O' : null;
  }, [currentGame?.players, userName]);

  const handleLeaveGame = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Game component: leaving game');
      // Since leaveGame API is not working, we'll just go back to lobby
      onBackToLobby();
    } catch (error) {
      console.error('Error leaving game:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [onBackToLobby]);

  const handleCellClick = useCallback(async (y: number, x: number) => {
    console.log('🎮 Game Component: Cell clicked at position:', y, x);
    console.log('🎮 Game Component: isConnected:', isConnected);
    console.log('🎮 Game Component: isGameEnded:', isGameEnded);
    console.log('🎮 Game Component: board[y][x]:', board[y][x]);
    console.log('🎮 Game Component: isMyTurn:', isMyTurn);
    console.log('🎮 Game Component: currentGame?.status:', currentGame?.status);

    if (!isConnected || isGameEnded || (board[y][x] !== null && board[y][x] !== '') || !isMyTurn || currentGame?.status !== 'playing') {
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
          position: index,
          userName: userName,
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
  }, [isConnected, board, isGameEnded, isMyTurn, currentGame?.status, getMyPlayerSymbol, gameId, userName]);

  // Manual refresh function
  const handleRefresh = useCallback(async () => {
    console.log('🔄 Manual refresh triggered');
    await Promise.all([
      refreshCurrentGame(gameId),
      refreshChatMessages(gameId)
    ]);
  }, [refreshCurrentGame, refreshChatMessages, gameId]);

  // Handle errors
  if (hasError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center mobile-padding">
        <div className="card text-center max-w-md w-full">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Game Error</h2>
          <p className="text-purple-200 mb-6 mobile-text">Something went wrong with the game. Please try again.</p>
          <button
            onClick={onBackToLobby}
            className="btn-primary w-full sm:w-auto"
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center mobile-padding">
        <div className="card text-center max-w-md w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Loading Game...</h2>
          <p className="text-purple-200 mobile-text mb-4">
            {showTimeoutMessage
              ? "Connection timeout. Please check your connection and try again."
              : "Connecting to game server"
            }
          </p>

          {/* Connection status indicator */}
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-4 ${isConnected
            ? 'bg-green-500/20 text-green-300 border border-green-400/30'
            : 'bg-red-500/20 text-red-300 border border-red-400/30'
            }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
            <span className="text-xs">{isConnected ? 'Connected to real-time' : 'Real-time disconnected (API still works)'}</span>
          </div>

          {showTimeoutMessage && (
            <button
              onClick={onBackToLobby}
              className="btn-primary w-full sm:w-auto"
            >
              Back to Lobby
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="game-root" className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 mobile-padding py-4 sm:py-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="mobile-heading font-bold text-white mb-2 sm:mb-4">
            Tic-Tac-Toe Game
          </h1>
          <p className="text-lg sm:text-xl text-purple-200 mb-2 sm:mb-4">
            Game: <span className="text-yellow-300 font-semibold">{currentGame.name}</span>
          </p>

          {/* Game Status and Refresh Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <div className="inline-flex items-center px-3 py-2 rounded-full text-sm font-medium bg-white/10 backdrop-blur-lg border border-white/20">
              <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
            
            {/* Manual Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`btn-secondary flex items-center gap-2 px-4 py-2 text-sm ${
                isRefreshing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-600'
              }`}
            >
              {isRefreshing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Refreshing...
                </>
              ) : (
                <>
                  <span>🔄</span>
                  Refresh Game
                </>
              )}
            </button>
          </div>
        </div>

        {/* Game Info - Mobile Responsive Grid */}
        <div className="grid mobile-grid gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="card text-center">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Players</h3>
            <div className="space-y-2">
              {(currentGame.players || []).map((player, index) => (
                <div key={player} className="flex items-center justify-center space-x-2 mobile-text">
                  <span className="text-purple-300">{index === 0 ? 'X' : 'O'}:</span>
                  <span className="text-white font-medium truncate">{player}</span>
                  {player === userName && (
                    <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded-full flex-shrink-0">You</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card text-center">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Status</h3>
            <p className="text-lg sm:text-xl font-bold text-purple-300">
              {currentGame.status === 'waiting' && 'Waiting for Players'}
              {currentGame.status === 'playing' && 'Game in Progress'}
              {currentGame.status === 'finished' && 'Game Finished'}
            </p>
            {currentGame.winner && (
              <p className="text-sm text-yellow-300 mt-1">
                Winner: {currentGame.winner}
              </p>
            )}
          </div>

          <div className="card text-center">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Turn</h3>
            <div className="text-lg sm:text-xl font-bold text-purple-300">
              {isMyTurn ? (
                <span className="text-green-400">Your Turn!</span>
              ) : currentGame.currentPlayer ? (
                <span>{currentGame.currentPlayer}'s Turn</span>
              ) : (
                <span>Waiting...</span>
              )}
            </div>
          </div>
        </div>

        {/* Game Board */}
        <div className="card text-center mb-6 sm:mb-8">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Game Board</h3>
          <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-xs sm:max-w-sm mx-auto">
            {board.map((row, y) =>
              row.map((cell, x) => (
                <button
                  key={`${y}-${x}`}
                  onClick={() => handleCellClick(y, x)}
                  disabled={!isMyTurn || isGameEnded || cell !== null || isLoading}
                  className={`
                    aspect-square text-2xl sm:text-4xl font-bold rounded-lg border-2 transition-all duration-200
                    ${cell === 'X' 
                      ? 'bg-blue-500/20 text-blue-400 border-blue-400/50' 
                      : cell === 'O' 
                        ? 'bg-red-500/20 text-red-400 border-red-400/50'
                        : 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/40'
                    }
                    ${!isMyTurn || isGameEnded || cell !== null || isLoading 
                      ? 'cursor-not-allowed opacity-50' 
                      : 'cursor-pointer hover:scale-105'
                    }
                  `}
                >
                  {cell || ''}
                </button>
              ))
            )}
          </div>
          
          {/* Game Message */}
          <p className="text-lg sm:text-xl font-semibold text-purple-300 mt-4">
            {gameMessage}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleLeaveGame}
            disabled={isLoading}
            className="btn-secondary"
          >
            {isLoading ? 'Leaving...' : 'Leave Game'}
          </button>
          
          {isGameEnded && (
            <button
              onClick={onBackToLobby}
              className="btn-primary"
            >
              Back to Lobby
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 