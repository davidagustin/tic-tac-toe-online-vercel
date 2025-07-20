import { NextRequest, NextResponse } from 'next/server';
import { pusherServer, CHANNELS, EVENTS } from '@/lib/pusher';
import { getGame, setGame } from '@/lib/game-storage';

// Check for winner
function checkWinner(board: (string | null)[]): string | null {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6] // diagonals
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  // Check for draw
  if (board.every(cell => cell !== null)) {
    return 'draw';
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { gameId, index, player } = await request.json();

    if (gameId === undefined || index === undefined || !player) {
      return NextResponse.json(
        { error: 'Game ID, index, and player are required' },
        { status: 400 }
      );
    }

    const game = getGame(gameId);
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    if (game.status !== 'playing') {
      return NextResponse.json(
        { error: 'Game is not in playing state' },
        { status: 400 }
      );
    }

    if (game.currentPlayer !== player) {
      return NextResponse.json(
        { error: 'Not your turn' },
        { status: 400 }
      );
    }

    if (index < 0 || index > 8) {
      return NextResponse.json(
        { error: 'Invalid move index' },
        { status: 400 }
      );
    }

    if (game.board[index] !== null) {
      return NextResponse.json(
        { error: 'Position already taken' },
        { status: 400 }
      );
    }

    // Make the move
    game.board[index] = player;

    // Check for winner
    const winner = checkWinner(game.board);
    if (winner) {
      game.status = 'finished';
      game.winner = winner === 'draw' ? null : winner;
      game.currentPlayer = null;
    } else {
      // Switch turns
      game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';
    }

    // Update game in storage
    setGame(gameId, game);

    // Trigger Pusher events
    if (pusherServer) {
      console.log('🎮 Move API: Triggering Pusher events...');
      console.log('🎮 Move API: Game state after move:', JSON.stringify(game, null, 2));
      console.log('🎮 Move API: Current player after move:', game.currentPlayer);
      
      await pusherServer.trigger(CHANNELS.LOBBY, EVENTS.GAME_UPDATED, {
        game,
      });
      console.log('✅ Move API: Lobby event triggered');

      await pusherServer.trigger(CHANNELS.GAME(gameId), EVENTS.PLAYER_MOVED, {
        game,
        move: { index, player },
      });
      console.log('✅ Move API: Player moved event triggered');

      if (winner) {
        await pusherServer.trigger(CHANNELS.GAME(gameId), EVENTS.GAME_ENDED, {
          game,
          winner: game.winner,
        });
        console.log('✅ Move API: Game ended event triggered');

        // Update statistics for both players
        if (game.winner) {
          // In a real app, you'd update database statistics here
          console.log(`Game ended. Winner: ${game.winner}`);
        } else {
          console.log('Game ended in a draw');
        }
      }
    } else {
      console.error('❌ Move API: Pusher server not available');
    }

    console.log('Move made:', { gameId, index, player, winner });

    return NextResponse.json({ 
      success: true, 
      game,
      winner,
      message: 'Move made successfully' 
    });

  } catch (error) {
    console.error('Error making move:', error);
    return NextResponse.json(
      { error: 'Failed to make move' },
      { status: 500 }
    );
  }
} 