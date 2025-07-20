import { cleanupInactiveUsers, cleanupOldGames } from '@/lib/game-storage';
import { pusherServer } from '@/lib/pusher';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  try {
    console.log('🧹 Starting periodic cleanup...');

    // Clean up old games
    cleanupOldGames();

    // Clean up inactive users
    cleanupInactiveUsers();

    // Get updated game list to notify lobby
    const { getAllGames } = await import('@/lib/game-storage');
    const updatedGames = getAllGames();

    // Notify lobby about any changes
    if (pusherServer) {
      await pusherServer.trigger('lobby', 'games-updated', {
        games: updatedGames,
        timestamp: new Date().toISOString()
      });
    }

    console.log('✅ Periodic cleanup completed');

    return NextResponse.json({
      success: true,
      message: 'Periodic cleanup completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error during periodic cleanup:', error);
    return NextResponse.json({
      error: 'Cleanup failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Periodic cleanup endpoint is working',
    timestamp: new Date().toISOString()
  });
} 