import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  try {
    // Temporarily disabled to prevent API spam
    console.log('🧹 Periodic cleanup temporarily disabled to prevent disconnections');

    return NextResponse.json({
      success: true,
      message: 'Periodic cleanup temporarily disabled',
      timestamp: new Date().toISOString()
    });

    /* 
    // Original cleanup code - disabled for now
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
    */
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
    message: 'Periodic cleanup endpoint is working (temporarily disabled)',
    timestamp: new Date().toISOString()
  });
} 