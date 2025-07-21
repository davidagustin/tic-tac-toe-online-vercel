import { NextRequest, NextResponse } from 'next/server';

// Import the shared game storage
import { games, gameConnections } from '@/lib/trpc';

export async function POST(request: NextRequest) {
  console.log('🧹 Cleanup Games API: Request received');
  
  try {
    const now = Date.now();
    const abandonedGames: string[] = [];
    
    // Find games with no players or very old games
    for (const [gameId, game] of games.entries()) {
      // Remove games with no players
      if (game.players.length === 0) {
        abandonedGames.push(gameId);
        continue;
      }
      
      // Remove games older than 1 hour (3600000 ms)
      const gameAge = now - game.createdAt.getTime();
      if (gameAge > 3600000) {
        abandonedGames.push(gameId);
        continue;
      }
    }
    
    // Clean up abandoned games
    for (const gameId of abandonedGames) {
      console.log('🧹 Cleaning up abandoned game:', gameId);
      games.delete(gameId);
      gameConnections.delete(gameId);
    }
    
    console.log(`🧹 Cleanup completed: ${abandonedGames.length} games removed`);
    
    return NextResponse.json({
      success: true,
      message: `Cleaned up ${abandonedGames.length} abandoned games`,
      removedGames: abandonedGames,
    });
    
  } catch (error) {
    console.error('Game cleanup error:', error);
    return NextResponse.json({ 
      error: 'Failed to cleanup games' 
    }, { status: 500 });
  }
} 