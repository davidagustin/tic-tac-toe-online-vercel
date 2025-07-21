import { NextRequest, NextResponse } from 'next/server';

// Import the shared game storage
import { games, gameConnections, userStats } from '@/lib/trpc';

export async function POST(request: NextRequest) {
  console.log('🚪 Leave API: Request received');
  
  try {
    const body = await request.json();
    const { gameId, userName } = body;
    
    console.log('🚪 Leave API: Request body:', { gameId, userName });

    if (!gameId || !userName) {
      return NextResponse.json({ 
        error: 'Game ID and user name are required' 
      }, { status: 400 });
    }

    const game = games.get(gameId);

    if (!game) {
      return NextResponse.json({ 
        error: 'Game not found' 
      }, { status: 404 });
    }

    if (!game.players.includes(userName)) {
      return NextResponse.json({ 
        error: 'Not a player in this game' 
      }, { status: 400 });
    }

    // Remove player from game
    game.players = game.players.filter(p => p !== userName);

    // If no players left, delete the game
    if (game.players.length === 0) {
      console.log('🧹 Cleaning up empty game:', gameId);
      games.delete(gameId);
      gameConnections.delete(gameId);
    } else {
      // If game was in progress, mark as finished
      if (game.status === 'playing') {
        game.status = 'finished';
        game.winner = 'abandoned';

        // Update statistics for remaining player
        const remainingPlayer = game.players[0];
        const remainingStats = userStats.get(remainingPlayer) || { wins: 0, losses: 0, draws: 0 };
        remainingStats.wins += 1;
        userStats.set(remainingPlayer, remainingStats);

        const leavingStats = userStats.get(userName) || { wins: 0, losses: 0, draws: 0 };
        leavingStats.losses += 1;
        userStats.set(userName, leavingStats);
      }
    }

    console.log('🚪 Player left game:', { gameId, userName, remainingPlayers: game.players.length });

    return NextResponse.json({
      success: true,
      message: 'Left game successfully',
    });
    
  } catch (error) {
    console.error('Game leave error:', error);
    return NextResponse.json({ 
      error: 'Failed to leave game' 
    }, { status: 500 });
  }
} 