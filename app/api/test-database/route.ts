import { NextResponse } from 'next/server';
import { query, getUserStatistics, updateGameStatistics } from '@/lib/db';

export async function GET() {
  try {
    // Test basic database connection
    const connectionTest = await query('SELECT NOW() as current_time');
    
    // Test statistics functionality
    const testUser = 'api_test_user';
    const initialStats = await getUserStatistics(testUser);
    
    // Test updating statistics
    const updateResult = await updateGameStatistics(testUser, 'win');
    
    // Get final stats
    const finalStats = await getUserStatistics(testUser);
    
    // Clean up test data
    await query('DELETE FROM game_statistics WHERE user_name = $1', [testUser]);
    
    return NextResponse.json({
      success: true,
      message: 'Database connection and operations successful',
      tests: {
        connection: {
          status: 'OK',
          currentTime: connectionTest[0]?.current_time
        },
        statistics: {
          initial: initialStats,
          afterUpdate: updateResult,
          final: finalStats
        }
      },
      cleanup: 'Test user statistics cleaned up',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Database test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
} 