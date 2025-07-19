'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSocket } from '@/hooks/useSocket';

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
  const { socket, isConnected } = useSocket();
  const [currentPlayer, setCurrentPlayer] = useState<string>("X");
  const [board, setBoard] = useState<BoardState>(INITIAL_BOARD);
  const [gameMessage, setGameMessage] = useState<string>("");
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  const [winner, setWinner] = useState<string | null>(null);
  const [players, setPlayers] = useState<string[]>([]);


  console.log('Game component mounted with gameId:', gameId, 'userName:', userName);
  console.log('Initial game status:', gameStatus);

  // Track game status changes
  useEffect(() => {
    console.log('Game status changed to:', gameStatus);
  }, [gameStatus]);

  // Memoized computed values
  const isGameEnded = useMemo(() => 
    gameStatus === 'finished' || winner !== null, 
    [gameStatus, winner]
  );

  const isMyTurn = useMemo(() => {
    const playerIndex = players.indexOf(userName);
    return playerIndex === 0 ? currentPlayer === 'X' : currentPlayer === 'O';
  }, [currentPlayer, players, userName]);

  // Get current player name
  const getCurrentPlayerName = useMemo(() => {
    if (players.length === 0) return 'Unknown';
    const playerIndex = currentPlayer === 'X' ? 0 : 1;
    return players[playerIndex] || 'Unknown';
  }, [currentPlayer, players]);

  // Get my player symbol
  const getMyPlayerSymbol = useMemo(() => {
    const playerIndex = players.indexOf(userName);
    return playerIndex === 0 ? 'X' : 'O';
  }, [players, userName]);

  const resetGame = useCallback(() => {
    if (socket) {
      // Reset local state
      setBoard(INITIAL_BOARD);
      setGameMessage("");
      setCurrentPlayer("X");
      setWinner(null);
      setGameStatus('playing');
      
      // Request server to reset the game
      socket.emit('reset game', gameId);
    }
  }, [socket, gameId]);

  const handleLeaveGame = useCallback(() => {
    if (socket) {
      console.log('Game component: leaving game');
      socket.emit('leave game', gameId, userName);
      onBackToLobby();
    }
  }, [socket, gameId, userName, onBackToLobby]);

  const gameCompletionCheck = useCallback((currentBoard: BoardState, player: string) => {
    if (!socket) return;

    // Check rows, columns, and diagonals
    for (let i = 0; i < 3; i++) {
      // Check rows
      if (currentBoard[i].every((cell) => cell === player)) {
        setWinner(player);
        setGameStatus('finished');
        setGameMessage(`${player} Wins!`);
        // Emit game finished event to server
        socket.emit('game finished', gameId, player);
        return;
      }
      // Check columns
      if (currentBoard.every((row) => row[i] === player)) {
        setWinner(player);
        setGameStatus('finished');
        setGameMessage(`${player} Wins!`);
        // Emit game finished event to server
        socket.emit('game finished', gameId, player);
        return;
      }
    }

    // Check diagonals
    if (currentBoard[0][0] === player && 
        currentBoard[1][1] === player && 
        currentBoard[2][2] === player) {
      setWinner(player);
      setGameStatus('finished');
      setGameMessage(`${player} Wins!`);
      // Emit game finished event to server
      socket.emit('game finished', gameId, player);
      return;
    }

    if (currentBoard[0][2] === player && 
        currentBoard[1][1] === player && 
        currentBoard[2][0] === player) {
      setWinner(player);
      setGameStatus('finished');
      setGameMessage(`${player} Wins!`);
      // Emit game finished event to server
      socket.emit('game finished', gameId, player);
      return;
    }

    // Check for draw
    if (currentBoard.every((row) => row.every((cell) => cell !== null))) {
      setGameStatus('finished');
      setGameMessage('It\'s a draw!');
      // Emit game finished event to server with no winner
      socket.emit('game finished', gameId, null);
    }
  }, [socket, gameId]);

  const handleCellClick = useCallback((y: number, x: number) => {
    if (!socket || isGameEnded || board[y][x] !== null || !isMyTurn || gameStatus !== 'playing') return;

    const newBoard = board.map(row => [...row]);
    newBoard[y][x] = currentPlayer;
    
    setBoard(newBoard);
    
    // Emit move to server
    socket.emit('make move', gameId, y * 3 + x, currentPlayer);
    
    // Check for game completion
    gameCompletionCheck(newBoard, currentPlayer);
  }, [socket, board, currentPlayer, isGameEnded, isMyTurn, gameStatus, gameId, gameCompletionCheck]);

  useEffect(() => {
    if (!socket) return;

    // Request current game data when component mounts
    console.log('Game component: requesting current game data for gameId:', gameId);
    socket.emit('get game', gameId);

    const handleMoveMade = (moveGameId: string, index: number, player: string, nextPlayer: string, gameWinner: string | null, status: string) => {
      if (moveGameId === gameId) {
        const y = Math.floor(index / 3);
        const x = index % 3;
        
        setBoard(prev => {
          const newBoard = prev.map(row => [...row]);
          newBoard[y][x] = player;
          return newBoard;
        });
        
        setCurrentPlayer(nextPlayer);
        setGameStatus(status as 'waiting' | 'playing' | 'finished');
        setWinner(gameWinner);
        
        if (gameWinner) {
          setGameMessage(`${gameWinner} Wins!`);
        } else if (status === 'finished') {
          setGameMessage('It\'s a draw!');
        }
      }
    };

    const handleGameStarted = (startedGameId: string) => {
      console.log('Game component: game started event received for game:', startedGameId);
      if (startedGameId === gameId) {
        console.log('Game component: updating game status to playing');
        setGameStatus('playing');
        setGameMessage('Game started!');
      }
    };

    const handleGameUpdated = (updatedGame: any) => {
      console.log('Game component: game updated event received:', updatedGame);
      if (updatedGame.id === gameId) {
        console.log('Game component: updating game with new data:', updatedGame);
        setPlayers(updatedGame.players);
        setGameStatus(updatedGame.status);
      }
    };

    const handleGameData = (gameData: any) => {
      console.log('Game component: received game data:', gameData);
      if (gameData && gameData.id === gameId) {
        console.log('Game component: updating with received game data');
        setPlayers(gameData.players || []);
        setGameStatus(gameData.status || 'waiting');
        setCurrentPlayer(gameData.currentPlayer || 'X');
        if (gameData.board) {
          // Convert 1D board to 2D
          const board2D = [];
          for (let i = 0; i < 3; i++) {
            board2D.push(gameData.board.slice(i * 3, (i + 1) * 3));
          }
          setBoard(board2D);
        }
      }
    };

    const handleGameReset = (resetGameId: string) => {
      console.log('Game component: game reset event received for game:', resetGameId);
      if (resetGameId === gameId) {
        console.log('Game component: resetting game state');
        setBoard(INITIAL_BOARD);
        setGameMessage('');
        setCurrentPlayer('X');
        setWinner(null);
        setGameStatus('playing');
      }
    };

    const handlePlayerLeftGame = (leftGameId: string, leftPlayerName: string, updatedGame: any) => {
      console.log('Game component: player left game event received:', leftPlayerName, 'from game:', leftGameId);
      if (leftGameId === gameId) {
        console.log('Game component: updating game after player left');
        setPlayers(updatedGame.players);
        setGameStatus(updatedGame.status);
        
        // Properly convert 1D board to 2D if it exists
        if (updatedGame.board && Array.isArray(updatedGame.board)) {
          const board2D = [];
          for (let i = 0; i < 3; i++) {
            board2D.push(updatedGame.board.slice(i * 3, (i + 1) * 3));
          }
          setBoard(board2D);
        } else {
          // Reset to initial board if no board data
          setBoard(INITIAL_BOARD);
        }
        
        setCurrentPlayer(updatedGame.currentPlayer || 'X');
        setWinner(null);
        setGameMessage(`${leftPlayerName} left the game. Waiting for a new player...`);
        
        // Request fresh game data to ensure synchronization
        socket.emit('get game', gameId);
      }
    };

    socket.on('move made', handleMoveMade);
    socket.on('game started', handleGameStarted);
    socket.on('game updated', handleGameUpdated);
    socket.on('game data', handleGameData);
    socket.on('game reset', handleGameReset);
    socket.on('player left game', handlePlayerLeftGame);

    return () => {
      socket.off('move made', handleMoveMade);
      socket.off('game started', handleGameStarted);
      socket.off('game updated', handleGameUpdated);
      socket.off('game data', handleGameData);
      socket.off('game reset', handleGameReset);
      socket.off('player left game', handlePlayerLeftGame);
    };
  }, [socket, gameId, userName, onBackToLobby, handleLeaveGame]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-400 rounded-3xl flex items-center justify-center shadow-xl">
              <span className="text-3xl">🎮</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
                Tic-Tac-Toe
              </h1>
              <p className="text-purple-200 text-lg">Game #{gameId}</p>
            </div>
          </div>
          
          {/* Game Status */}
          <div className="space-y-4">
            {/* Player List */}
            {players.length > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <h3 className="text-lg font-semibold text-white text-center mb-3">👥 Players</h3>
                <div className="grid grid-cols-2 gap-4">
                  {players.map((player, index) => (
                    <div 
                      key={player} 
                      className={`text-center p-3 rounded-xl border-2 transition-all duration-300 ${
                        currentPlayer === (index === 0 ? 'X' : 'O') && gameStatus === 'playing'
                          ? 'border-green-400 bg-green-500/20 shadow-lg shadow-green-500/25'
                          : 'border-white/20 bg-white/5'
                      }`}
                    >
                      <div className="text-sm text-purple-300 mb-1">
                        {player === userName ? 'You' : 'Opponent'}
                      </div>
                      <div className="font-bold text-white">{player}</div>
                      <div className="text-2xl mt-1">
                        {index === 0 ? '❌' : '⭕'}
                      </div>
                      <div className="text-xs text-purple-300">
                        {index === 0 ? 'Player X' : 'Player O'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Turn Indicator */}
            {gameStatus === 'playing' && (
              <div className="bg-gradient-to-r from-purple-600/20 to-pink-400/20 rounded-2xl p-6 border border-white/20 shadow-lg">
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${isMyTurn ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                    <h3 className="text-2xl font-bold text-white">
                      {isMyTurn ? '🎯 Your Turn!' : '⏳ Waiting for Opponent'}
                    </h3>
                    <div className={`w-4 h-4 rounded-full ${isMyTurn ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                  </div>
                  
                  <div className="text-lg text-purple-200">
                    Current Player: <span className="font-bold text-white">{getCurrentPlayerName}</span>
                    <span className="mx-2 text-2xl">
                      {currentPlayer === 'X' ? '❌' : '⭕'}
                    </span>
                  </div>
                  
                  <div className="text-sm text-purple-300">
                    You are playing as: <span className="font-semibold text-green-300">{getMyPlayerSymbol}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Game Status Messages */}
            <div className="text-center space-y-2">
              {gameStatus === 'waiting' && (
                <div className="text-white text-xl font-semibold bg-yellow-500/20 px-4 py-2 rounded-xl border border-yellow-400/30">
                  ⏳ Waiting for players to join...
                </div>
              )}
              
              {gameStatus === 'finished' && (
                <div className="text-white text-xl font-semibold bg-purple-500/20 px-4 py-2 rounded-xl border border-purple-400/30">
                  {winner ? `🏆 ${winner} Wins!` : '🤝 It\'s a Draw!'}
                </div>
              )}
              
              {gameMessage && gameStatus !== 'playing' && (
                <div className="text-purple-300 text-lg">{gameMessage}</div>
              )}
            </div>
          </div>
        </div>

        {/* Game Board */}
        <div className="flex justify-center mb-8">
          <div className="grid grid-cols-3 gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            {board.map((row, y) =>
              row.map((cell, x) => (
                <button
                  key={`${y}-${x}`}
                  onClick={() => handleCellClick(y, x)}
                  disabled={cell !== null || !isMyTurn || gameStatus !== 'playing'}
                  className={`w-20 h-20 border-2 rounded-xl text-3xl font-bold transition-all duration-300 relative overflow-hidden ${
                    cell !== null
                      ? 'bg-white/20 border-white/30 cursor-default'
                      : isMyTurn && gameStatus === 'playing'
                      ? 'bg-white/10 border-green-400/50 hover:bg-green-500/20 hover:border-green-400 hover:scale-105 cursor-pointer'
                      : 'bg-white/5 border-white/20 opacity-50 cursor-not-allowed'
                  } ${
                    cell === 'X' 
                      ? 'text-blue-400 shadow-lg shadow-blue-500/25' 
                      : cell === 'O' 
                      ? 'text-red-400 shadow-lg shadow-red-500/25'
                      : ''
                  }`}
                >
                  {cell}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Game Controls */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={handleLeaveGame}
            className="bg-red-500/20 backdrop-blur-sm text-red-300 font-medium py-3 px-6 rounded-xl border border-red-400/30 transition-all duration-300 hover:bg-red-500/30 hover:scale-105 cursor-pointer"
          >
            🚪 Leave Game
          </button>
          

          
          {gameStatus === 'finished' && (
            <button
              onClick={resetGame}
              className="bg-gradient-to-r from-purple-600 to-pink-400 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 hover:from-purple-700 hover:to-pink-500 transform hover:scale-105 shadow-lg cursor-pointer"
            >
              Play Again
            </button>
          )}
        </div>

        {/* Connection Status */}
        <div className="text-center mt-6">
          <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${
            isConnected 
              ? 'bg-green-500/20 text-green-300 border border-green-400/30'
              : 'bg-red-500/20 text-red-300 border border-red-400/30'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
            <span className="font-medium">
              {isConnected ? 'Connected to server' : 'Disconnected from server'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 