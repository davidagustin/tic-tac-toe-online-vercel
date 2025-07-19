import { NextResponse } from 'next/server';
import { query, getUserStatistics, updateGameStatistics } from '@/lib/db';

// Enhanced logging function
function logTestStep(step: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${step}: ${message}`);
  if (data) {
    console.log(`[${timestamp}] ${step} Data:`, JSON.stringify(data, null, 2));
  }
}

function logTestError(step: string, error: any, context: any = {}) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ❌ ${step} FAILED:`);
  console.error(`[${timestamp}] Error:`, error.message || error);
  console.error(`[${timestamp}] Stack:`, error.stack);
  console.error(`[${timestamp}] Context:`, JSON.stringify(context, null, 2));
}

export async function GET() {
  try {
    logTestStep('TEST_START', 'Starting basic database test...');
    logTestStep('ENV_CHECK', `DATABASE_URL configured: ${!!process.env.DATABASE_URL}`);

    // Test basic database connection
    logTestStep('CONNECTION', 'Testing database connection...');
    const connectionTest = await query('SELECT NOW() as current_time');
    logTestStep('CONNECTION', 'Database connection successful', { 
      currentTime: connectionTest[0]?.current_time 
    });
    
    // Test statistics functionality
    const testUser = 'api_test_user';
    logTestStep('STATS_GET', `Getting initial statistics for user: ${testUser}`);
    const initialStats = await getUserStatistics(testUser);
    logTestStep('STATS_GET', 'Initial statistics retrieved', { initialStats });
    
    // Test updating statistics
    logTestStep('STATS_UPDATE', 'Testing statistics update with win...');
    const updateResult = await updateGameStatistics(testUser, 'win');
    logTestStep('STATS_UPDATE', 'Statistics updated successfully', { updateResult });
    
    // Get final stats
    logTestStep('STATS_FINAL', 'Getting final statistics...');
    const finalStats = await getUserStatistics(testUser);
    logTestStep('STATS_FINAL', 'Final statistics retrieved', { finalStats });
    
    // Clean up test data
    logTestStep('CLEANUP', 'Cleaning up test data...');
    const cleanupResult = await query('DELETE FROM game_statistics WHERE user_name = $1', [testUser]);
    logTestStep('CLEANUP', `Test data cleaned up: ${cleanupResult.length} rows affected`);
    
    logTestStep('TEST_SUCCESS', 'Database test completed successfully!');
    
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
      cleanup: `Test user statistics cleaned up: ${cleanupResult.length} rows affected`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logTestError('TEST_DATABASE', error, { 
      operation: 'basic_database_test',
      testUser: 'api_test_user'
    });
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Database test failed',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
} 