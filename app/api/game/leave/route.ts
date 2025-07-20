import { NextRequest, NextResponse } from 'next/server';
import { games, gameConnections, broadcastGameEvent } from '@/lib/trpc';

// In-memory storage for game statistics
const userStats = new Map<string, { wins: number; losses: number; draws: number }>();

// Helper function to update user statistics
function updateUserStats(username: string, result: 'win' | 'loss' | 'draw') {
  if (!userStats.has(username)) {
    userStats.set(username, { wins: 0, losses: 0, draws: 0 });
  }
  
  const stats = userStats.get(username)!;
  stats[result === 'win' ? 'wins' : result === 'loss' ? 'losses' : 'draws']++;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameId, userName } = body;

    if (!gameId || !userName) {
      return NextResponse.json({ error: 'Game ID and user name are required' }, { status: 400 });
    }

    const game = games.get(gameId);

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (!game.players.includes(userName)) {
      return NextResponse.json({ error: 'Not a player in this game' }, { status: 400 });
    }

    // Remove player from game
    game.players = game.players.filter(p => p !== userName);

    // If no players left, delete the game
    if (game.players.length === 0) {
      games.delete(gameId);
      gameConnections.delete(gameId);
    } else {
      // If game was in progress, mark as finished
      if (game.status === 'playing') {
        game.status = 'finished';
        game.winner = 'abandoned';
        
        // Update statistics for remaining player
        const remainingPlayer = game.players[0];
        updateUserStats(remainingPlayer, 'win');
        updateUserStats(userName, 'loss');
      }
    }

    // Broadcast player left event
    broadcastGameEvent(gameId, {
      type: 'playerLeft',
      gameId,
      data: {
        player: userName,
        remainingPlayers: game.players,
        status: game.status,
      },
      timestamp: Date.now(),
      userId: userName,
    });

    return NextResponse.json({
      success: true,
      message: 'Left game successfully',
    });
  } catch (error) {
    console.error('Game leave error:', error);
    return NextResponse.json({ error: 'Failed to leave game' }, { status: 500 });
  }
} 