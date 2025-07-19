const { Pool } = require('pg');
const { query, updateGameStatistics, getUserStatistics } = require('../lib/db.js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Enhanced logging function
function logTestStep(step, message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${step}: ${message}`);
  if (data) {
    console.log(`[${timestamp}] ${step} Data:`, JSON.stringify(data, null, 2));
  }
}

function logTestError(step, error, context = {}) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ❌ ${step} FAILED:`);
  console.error(`[${timestamp}] Error:`, error.message);
  console.error(`[${timestamp}] Stack:`, error.stack);
  console.error(`[${timestamp}] Context:`, JSON.stringify(context, null, 2));
}

async function testDatabase() {
  logTestStep('TEST_START', 'Starting database connection and statistics test...');
  logTestStep('ENV_CHECK', `DATABASE_URL configured: ${!!process.env.DATABASE_URL}`);
  
  if (!process.env.DATABASE_URL) {
    logTestError('ENV_CHECK', new Error('DATABASE_URL not found!'), { 
      operation: 'environment_check' 
    });
    return;
  }

  try {
    // Test getting statistics for a user
    logTestStep('STATS_GET', 'Testing getUserStatistics...');
    const stats = await getUserStatistics('testuser');
    logTestStep('STATS_GET', 'Initial stats retrieved successfully', { stats });

    // Test updating statistics
    logTestStep('STATS_UPDATE', 'Testing updateGameStatistics with win...');
    const result = await updateGameStatistics('testuser', 'win');
    logTestStep('STATS_UPDATE', 'Statistics updated successfully', { result });

    // Test getting updated statistics
    logTestStep('STATS_GET_AFTER', 'Testing getUserStatistics after update...');
    const updatedStats = await getUserStatistics('testuser');
    logTestStep('STATS_GET_AFTER', 'Updated stats retrieved successfully', { updatedStats });

    // Test another update
    logTestStep('STATS_UPDATE_2', 'Testing another update with loss...');
    const lossResult = await updateGameStatistics('testuser', 'loss');
    logTestStep('STATS_UPDATE_2', 'Second statistics update successful', { lossResult });

    const finalStats = await getUserStatistics('testuser');
    logTestStep('STATS_FINAL', 'Final stats retrieved successfully', { finalStats });

    logTestStep('TEST_SUCCESS', 'Database test completed successfully!');
  } catch (error) {
    logTestError('TEST_DATABASE', error, { 
      operation: 'database_test',
      testUser: 'testuser'
    });
  } finally {
    // Clean up test data
    logTestStep('CLEANUP', 'Cleaning up test data...');
    try {
      const cleanupResult = await query('DELETE FROM game_statistics WHERE user_name = $1', ['testuser']);
      logTestStep('CLEANUP', `Test user statistics cleaned up: ${cleanupResult.length} rows affected`);
    } catch (cleanupError) {
      logTestError('CLEANUP', cleanupError, { 
        operation: 'cleanup_test_data',
        testUser: 'testuser'
      });
    }
  }
}

testDatabase(); 