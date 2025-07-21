import { NextRequest, NextResponse } from 'next/server';
import { games, broadcastGameEvent, updateUserStats } from '@/lib/trpc';

// Helper function to check for winner
function checkWinner(board: string[]): string | null {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6], // diagonals
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  return null;
}



export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameId, position, userName } = body;

    if (!gameId || position === undefined || !userName) {
      return NextResponse.json({ error: 'Game ID, position, and user name are required' }, { status: 400 });
    }

    console.log('🎯 Move API: Looking for gameId:', gameId);
    console.log('🎯 Move API: Available games:', Array.from(games.keys()));
    
    const game = games.get(gameId);

    if (!game) {
      console.log('❌ Move API: Game not found');
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    
    console.log('✅ Move API: Found game:', game);

    if (game.status !== 'playing') {
      return NextResponse.json({ error: 'Game is not active' }, { status: 400 });
    }

    if (!game.players.includes(userName)) {
      return NextResponse.json({ error: 'Not a player in this game' }, { status: 400 });
    }

    if (game.currentPlayer !== userName) {
      return NextResponse.json({ error: 'Not your turn' }, { status: 400 });
    }

    if (game.board[position] !== '') {
      return NextResponse.json({ error: 'Position already taken' }, { status: 400 });
    }

    // Make the move
    const symbol = game.players.indexOf(userName) === 0 ? 'X' : 'O';
    game.board[position] = symbol;
    game.lastMove = {
      position,
      symbol,
      player: userName,
    };

    // Check for winner
    const winner = checkWinner(game.board);
    if (winner) {
      game.status = 'finished';
      game.winner = userName;
      
      // Update statistics
      updateUserStats(userName, 'win');
      const otherPlayer = game.players.find(p => p !== userName);
      if (otherPlayer) {
        updateUserStats(otherPlayer, 'loss');
      }
    } else if (game.board.every(cell => cell !== '')) {
      game.status = 'finished';
      game.winner = 'tie';
      
      // Update statistics for both players
      game.players.forEach(player => {
        updateUserStats(player, 'draw');
      });
    } else {
      // Switch turns
      game.currentPlayer = game.players.find(p => p !== game.currentPlayer) || game.currentPlayer;
    }

    // Broadcast move made event
    broadcastGameEvent(gameId, {
      type: 'moveMade',
      gameId,
      data: {
        position,
        symbol,
        board: game.board,
        currentPlayer: game.currentPlayer,
        status: game.status,
        winner: game.winner,
        lastMove: game.lastMove,
      },
      timestamp: Date.now(),
      userId: userName,
    });

    // If game is finished, broadcast game finished event
    if (game.status === 'finished') {
      broadcastGameEvent(gameId, {
        type: 'gameFinished',
        gameId,
        data: {
          winner: game.winner,
          board: game.board,
          players: game.players,
          finalMove: game.lastMove,
        },
        timestamp: Date.now(),
        userId: userName,
      });
    }

    return NextResponse.json({
      success: true,
      game: {
        id: game.id,
        board: game.board,
        currentPlayer: game.currentPlayer,
        status: game.status,
        winner: game.winner,
        lastMove: game.lastMove,
      },
    });
  } catch (error) {
    console.error('Game move error:', error);
    return NextResponse.json({ error: 'Failed to make move' }, { status: 500 });
  }
} 