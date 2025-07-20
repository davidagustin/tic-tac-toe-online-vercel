import { NextRequest, NextResponse } from 'next/server';
import { pusherServer, CHANNELS, EVENTS } from '@/lib/pusher';
import { updateGameStatistics } from '@/lib/db';

// In-memory storage for games (in production, you'd use a database)
const games = new Map();

// Helper function to check for winner
function checkWinner(board: (string | null)[]) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6] // diagonals
  ];
  
  for (const line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

// POST /api/games/[id]/move - Make a move
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { index, player, userName } = await request.json();
    const gameId = id;
    
    if (index === undefined || !player || !userName) {
      return NextResponse.json({ error: 'Index, player, and userName are required' }, { status: 400 });
    }

    const game = games.get(gameId);
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'playing') {
      return NextResponse.json({ error: 'Game is not in playing state' }, { status: 400 });
    }

    if (game.board[index] !== null) {
      return NextResponse.json({ error: 'Invalid move' }, { status: 400 });
    }

    // Make the move
    game.board[index] = player;
    game.currentPlayer = player === 'X' ? 'O' : 'X';
    
    // Check for winner
    const winner = checkWinner(game.board);
    if (winner) {
      game.winner = winner;
      game.status = 'finished';
      
      // Update game statistics
      if (game.players && game.players.length === 2) {
        const player1 = game.players[0];
        const player2 = game.players[1];
        
        if (winner === 'X') {
          await updateGameStatistics(player1, 'win');
          await updateGameStatistics(player2, 'loss');
        } else {
          await updateGameStatistics(player1, 'loss');
          await updateGameStatistics(player2, 'win');
        }
      }
    } else if (game.board.every((cell: string | null) => cell !== null)) {
      game.status = 'finished';
      
      // Update game statistics for draw
      if (game.players && game.players.length === 2) {
        const player1 = game.players[0];
        const player2 = game.players[1];
        await updateGameStatistics(player1, 'draw');
        await updateGameStatistics(player2, 'draw');
      }
    }

    // Trigger Pusher events
    if (pusherServer) {
      await pusherServer.trigger(CHANNELS.GAME(gameId), EVENTS.PLAYER_MOVED, { game });
      await pusherServer.trigger(CHANNELS.LOBBY, EVENTS.GAME_UPDATED, { game });

      if (game.status === 'finished') {
        await pusherServer.trigger(CHANNELS.GAME(gameId), EVENTS.GAME_ENDED, { 
          game, 
          winner: game.winner 
        });
      }
    }

    return NextResponse.json(game);
  } catch (error) {
    console.error('Error making move:', error);
    return NextResponse.json({ error: 'Failed to make move' }, { status: 500 });
  }
} 