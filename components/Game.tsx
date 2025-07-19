'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSocket } from '@/hooks/useSocket';

type BoardState = (string | null)[][];

const INITIAL_BOARD: BoardState = [
  [null, null, null],
  [null, null, null],
  [null, null, null]
];

export default function Game() {
  const { socket, isConnected } = useSocket();
  const [currentPlayer, setCurrentPlayer] = useState<string>("X");
  const [board, setBoard] = useState<BoardState>(INITIAL_BOARD);
  const [gameMessage, setGameMessage] = useState<string>("");

  // Memoized computed values
  const isGameEnded = useMemo(() => 
    gameMessage.includes("Wins") || gameMessage.includes("Neither"), 
    [gameMessage]
  );

  const resetGame = useCallback(() => {
    if (socket) {
      socket.emit('reset board', {});
    }
  }, [socket]);

  const gameCompletionCheck = useCallback((currentBoard: BoardState, player: string) => {
    if (!socket) return;

    // Check rows, columns, and diagonals in one loop
    for (let i = 0; i < 3; i++) {
      // Check rows
      if (currentBoard[i].every((cell) => cell === player)) {
        socket.emit('console', { console: `${player} Wins!` });
        return;
      }
      // Check columns
      if (currentBoard.every((row) => row[i] === player)) {
        socket.emit('console', { console: `${player} Wins!` });
        return;
      }
    }

    // Check diagonals
    if (currentBoard[0][0] === player && 
        currentBoard[1][1] === player && 
        currentBoard[2][2] === player) {
      socket.emit('console', { console: `${player} Wins!` });
      return;
    }

    if (currentBoard[0][2] === player && 
        currentBoard[1][1] === player && 
        currentBoard[2][0] === player) {
      socket.emit('console', { console: `${player} Wins!` });
      return;
    }

    // Check for draw
    if (currentBoard.every((row) => row.every((cell) => cell !== null))) {
      socket.emit('console', { console: 'Neither X or O Wins.' });
    }
  }, [socket]);

  const handleCellClick = useCallback((y: number, x: number) => {
    if (!socket || isGameEnded || board[y][x] !== null) return;

    const newBoard = board.map(row => [...row]);
    newBoard[y][x] = currentPlayer;
    
    setBoard(newBoard);
    socket.emit('game board', newBoard);
    gameCompletionCheck(newBoard, currentPlayer);
  }, [socket, board, currentPlayer, isGameEnded, gameCompletionCheck]);

  useEffect(() => {
    if (!socket) return;

    const handleGameBoard = (newBoard: BoardState) => {
      setBoard(newBoard);
      setGameMessage("");
      setCurrentPlayer(prev => prev === "X" ? "O" : "X");
    };

    const handleResetBoard = () => {
      setBoard(INITIAL_BOARD);
      setGameMessage("");
      setCurrentPlayer("X");
    };

    const handleConsole = (message: { console: string }) => {
      setGameMessage(message.console);
    };

    socket.on('game board', handleGameBoard);
    socket.on('reset board', handleResetBoard);
    socket.on('console', handleConsole);

    return () => {
      socket.off('game board', handleGameBoard);
      socket.off('reset board', handleResetBoard);
      socket.off('console', handleConsole);
    };
  }, [socket]);

  const renderCell = useCallback((cell: string | null, y: number, x: number) => (
    <button
      key={`${y}-${x}`}
      className={`w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center border-2 ${
        cell 
          ? 'border-gray-300 cursor-default' 
          : 'border-gray-200 hover:border-blue-300 cursor-pointer'
      } ${isGameEnded ? 'opacity-75' : ''}`}
      onClick={() => handleCellClick(y, x)}
      disabled={isGameEnded || cell !== null}
    >
      {cell && (
        <span className={`text-4xl sm:text-5xl font-bold ${
          cell === 'X' 
            ? 'text-blue-600 drop-shadow-lg' 
            : 'text-red-600 drop-shadow-lg'
        }`}>
          {cell}
        </span>
      )}
    </button>
  ), [handleCellClick, isGameEnded]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">🎮 Game Board</h2>
        <p className="text-gray-600">Take turns placing X and O on the board</p>
      </div>

      {/* Game Board */}
      <div className="flex justify-center">
        <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-4 rounded-2xl shadow-inner">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {board.map((row, y) =>
              row.map((cell, x) => renderCell(cell, y, x))
            )}
          </div>
        </div>
      </div>

      {/* Game Status */}
      <div className="space-y-4">
        {/* Current Turn */}
        <div className="text-center">
          <div className={`inline-flex items-center space-x-3 px-6 py-3 rounded-full ${
            currentPlayer === 'X' 
              ? 'bg-blue-100 text-blue-800 border border-blue-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            <div className={`w-3 h-3 rounded-full animate-pulse ${
              currentPlayer === 'X' ? 'bg-blue-500' : 'bg-red-500'
            }`}></div>
            <span className="font-semibold text-lg">
              Current Turn: <span className="text-2xl">{currentPlayer}</span>
            </span>
          </div>
        </div>

        {/* Game Message */}
        {gameMessage && (
          <div className="text-center">
            <div className={`inline-block px-6 py-3 rounded-xl ${
              gameMessage.includes("Wins") 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : gameMessage.includes("Neither")
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                : 'bg-gray-100 text-gray-800 border border-gray-200'
            }`}>
              <span className="font-medium text-lg">
                {gameMessage.includes("Wins") && "🎉 "}
                {gameMessage.includes("Neither") && "🤝 "}
                {gameMessage}
              </span>
            </div>
          </div>
        )}

        {/* Reset Button */}
        {isGameEnded && (
          <div className="text-center">
            <button
              onClick={resetGame}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg shadow-green-500/25 text-lg"
            >
              🔄 New Game
            </button>
          </div>
        )}
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 bg-red-100 text-red-800 px-4 py-2 rounded-full border border-red-200">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm font-medium">
              Socket not connected. Game may not work properly.
            </span>
          </div>
        </div>
      )}
    </div>
  );
} 