'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePusher } from '@/hooks/usePusher';
import type { Game } from '@/lib/pusher-client';

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

  console.log('Game component mounted with gameId:', gameId, 'userName:', userName);
  console.log('Current game from Pusher:', currentGame);

  // Join game channel when component mounts
  useEffect(() => {
    if (isConnected && gameId) {
      joinGame(gameId, userName);
    }
  }, [isConnected, gameId, userName, joinGame]);

  // Update local state when game data changes
  useEffect(() => {
    if (currentGame && currentGame.id === gameId) {
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
          setGameMessage(`${currentGame.winner} Wins!`);
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
    }
  }, [currentGame, gameId]);

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
    if (!isConnected || isGameEnded || board[y][x] !== null || !isMyTurn || currentGame?.status !== 'playing') {
      return;
    }

    try {
      setIsLoading(true);
      const index = y * 3 + x;
      const playerSymbol = getMyPlayerSymbol;

      if (!playerSymbol) {
        console.error('Player symbol not found');
        return;
      }

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

      if (!response.ok) {
        throw new Error(data.error || 'Failed to make move');
      }

      console.log('Move made successfully:', data);
    } catch (error: any) {
      console.error('Error making move:', error);
      setHasError(true);
      alert(error.message || 'Failed to make move. Please try again.');
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

  // Show loading state
  if (!currentGame || !isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-lg text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading Game...</h2>
          <p className="text-purple-200">Connecting to game server</p>
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