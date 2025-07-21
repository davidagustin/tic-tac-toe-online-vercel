import { NextResponse } from 'next/server';
import { games, gameConnections, userStats } from '@/lib/trpc';

export async function POST() {
  console.log('🧹 Clear DB API: Request received');
  
  try {
    // Clear all games
    const gameCount = games.size;
    games.clear();
    gameConnections.clear();
    
    // Clear all user stats
    const statsCount = userStats.size;
    userStats.clear();
    
    console.log(`🧹 Clear DB completed: ${gameCount} games and ${statsCount} user stats removed`);
    
    return NextResponse.json({
      success: true,
      message: `Cleared ${gameCount} games and ${statsCount} user stats`,
      clearedGames: gameCount,
      clearedStats: statsCount,
    });
    
  } catch (error) {
    console.error('Clear DB error:', error);
    return NextResponse.json({ 
      error: 'Failed to clear database' 
    }, { status: 500 });
  }
} 