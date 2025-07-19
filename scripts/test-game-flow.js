const { Pool } = require('pg');
const { 
  query, 
  getUserStatistics, 
  updateGameStatistics, 
  saveGameMessage, 
  getGameMessages,
  initializeDatabase 
} = require('../lib/db.js');
const { AuthService } = require('../lib/auth.js');

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

async function cleanupTestData() {
  logTestStep('CLEANUP', 'Starting test data cleanup...');
  
  try {
    // Clean up test users
    const userResult = await query('DELETE FROM users WHERE username LIKE $1', ['%test%']);
    logTestStep('CLEANUP', `Test users cleaned up: ${userResult.length} rows affected`);

    // Clean up test game statistics
    const statsResult1 = await query('DELETE FROM game_statistics WHERE user_name LIKE $1', ['%test%']);
    const statsResult2 = await query('DELETE FROM game_statistics WHERE user_name IN ($1, $2)', ['player1', 'player2']);
    logTestStep('CLEANUP', `Test game statistics cleaned up: ${statsResult1.length + statsResult2.length} rows affected`);

    // Clean up test chat messages
    const chatResult = await query('DELETE FROM game_chat_messages WHERE game_id LIKE $1', ['%test%']);
    logTestStep('CLEANUP', `Test chat messages cleaned up: ${chatResult.length} rows affected`);

    // Clean up test lobby messages (if any were created)
    const lobbyResult = await query('DELETE FROM lobby_chat_messages WHERE user_name LIKE $1', ['%test%']);
    logTestStep('CLEANUP', `Test lobby messages cleaned up: ${lobbyResult.length} rows affected`);

    logTestStep('CLEANUP', 'All test data cleaned up successfully!');
  } catch (error) {
    logTestError('CLEANUP', error, { operation: 'cleanup_test_data' });
  }
}

async function testGameFlow() {
  logTestStep('TEST_START', 'Starting comprehensive game flow test...');
  logTestStep('ENV_CHECK', `DATABASE_URL configured: ${!!process.env.DATABASE_URL}`);

  const testResults = {
    auth: {},
    gameCreation: {},
    gameplay: {},
    gameCompletion: {},
    postGame: {},
    summary: {}
  };

  try {
    // Initialize database first
    logTestStep('INIT', 'Initializing database...');
    await initializeDatabase();
    logTestStep('INIT', 'Database initialized successfully');

    // 1. AUTHENTICATION TESTS
    logTestStep('AUTH', 'Starting authentication tests...');
    try {
      const testUser = 'gameflow_test_user';
      const testPassword = 'testpassword123';
      
      logTestStep('AUTH', `Attempting to create user: ${testUser}`);
      const registerResult = await AuthService.createUser(testUser, testPassword);
      testResults.auth.registration = {
        success: true,
        message: 'User registration successful',
        user: testUser,
        userId: registerResult?.id
      };
      logTestStep('AUTH', 'User registration successful', { userId: registerResult?.id });

      logTestStep('AUTH', `Attempting to validate credentials for: ${testUser}`);
      const loginResult = await AuthService.validateCredentials(testUser, testPassword);
      testResults.auth.login = {
        success: true,
        message: 'User login successful',
        user: testUser,
        validated: loginResult
      };
      logTestStep('AUTH', 'User login successful', { validated: loginResult });

    } catch (error) {
      logTestError('AUTH', error, { 
        testUser: 'gameflow_test_user',
        operation: 'authentication_test'
      });
      testResults.auth = {
        success: false,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
    }

    // 2. GAME CREATION TESTS
    logTestStep('GAME_CREATION', 'Starting game creation tests...');
    try {
      const gameId = `test_game_${Date.now()}`;
      logTestStep('GAME_CREATION', `Creating test game with ID: ${gameId}`);
      
      // Create player statistics entries
      const player1Result = await query(`
        INSERT INTO game_statistics (user_name, wins, losses, draws, total_games) 
        VALUES ($1, 0, 0, 0, 0) 
        ON CONFLICT (user_name) DO NOTHING
      `, ['player1']);
      logTestStep('GAME_CREATION', 'Player1 statistics created', { rowsAffected: player1Result.length });

      const player2Result = await query(`
        INSERT INTO game_statistics (user_name, wins, losses, draws, total_games) 
        VALUES ($1, 0, 0, 0, 0) 
        ON CONFLICT (user_name) DO NOTHING
      `, ['player2']);
      logTestStep('GAME_CREATION', 'Player2 statistics created', { rowsAffected: player2Result.length });

      testResults.gameCreation = {
        success: true,
        message: 'Game creation simulation successful',
        gameId: gameId,
        player1Created: player1Result.length > 0,
        player2Created: player2Result.length > 0
      };
      logTestStep('GAME_CREATION', 'Game creation successful');

    } catch (error) {
      logTestError('GAME_CREATION', error, { 
        gameId: `test_game_${Date.now()}`,
        operation: 'game_creation_test'
      });
      testResults.gameCreation = {
        success: false,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
    }

    // 3. GAMEPLAY TESTS
    logTestStep('GAMEPLAY', 'Starting gameplay tests...');
    try {
      const gameId = `gameplay_test_${Date.now()}`;
      logTestStep('GAMEPLAY', `Testing gameplay with game ID: ${gameId}`);
      
      // Test saving game messages during gameplay
      logTestStep('GAMEPLAY', 'Saving game messages...');
      const message1 = await saveGameMessage(gameId, 'Good move!', 'player1');
      const message2 = await saveGameMessage(gameId, 'Thanks!', 'player2');
      const message3 = await saveGameMessage(gameId, 'This is getting intense!', 'player1');
      
      logTestStep('GAMEPLAY', 'Game messages saved', { 
        message1Id: message1?.id,
        message2Id: message2?.id,
        message3Id: message3?.id
      });

      // Retrieve game messages
      logTestStep('GAMEPLAY', 'Retrieving game messages...');
      const gameMessages = await getGameMessages(gameId, 10);
      logTestStep('GAMEPLAY', 'Game messages retrieved', { 
        count: gameMessages.length,
        messageIds: gameMessages.map(m => m.id)
      });

      testResults.gameplay = {
        success: true,
        message: 'Gameplay simulation successful',
        gameId: gameId,
        messagesSent: 3,
        messagesRetrieved: gameMessages.length,
        messageIds: [message1?.id, message2?.id, message3?.id]
      };
      logTestStep('GAMEPLAY', 'Gameplay test successful');

    } catch (error) {
      logTestError('GAMEPLAY', error, { 
        gameId: `gameplay_test_${Date.now()}`,
        operation: 'gameplay_test'
      });
      testResults.gameplay = {
        success: false,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
    }

    // 4. GAME COMPLETION TESTS
    logTestStep('GAME_COMPLETION', 'Starting game completion tests...');
    try {
      const winner = 'player1';
      const loser = 'player2';
      logTestStep('GAME_COMPLETION', `Simulating game completion - Winner: ${winner}, Loser: ${loser}`);

      // Get initial statistics
      const initialWinnerStats = await getUserStatistics(winner);
      const initialLoserStats = await getUserStatistics(loser);
      logTestStep('GAME_COMPLETION', 'Initial statistics retrieved', {
        winner: initialWinnerStats,
        loser: initialLoserStats
      });

      // Update statistics for winner and loser
      logTestStep('GAME_COMPLETION', 'Updating winner statistics...');
      const winnerStats = await updateGameStatistics(winner, 'win');
      logTestStep('GAME_COMPLETION', 'Winner statistics updated', { result: winnerStats });

      logTestStep('GAME_COMPLETION', 'Updating loser statistics...');
      const loserStats = await updateGameStatistics(loser, 'loss');
      logTestStep('GAME_COMPLETION', 'Loser statistics updated', { result: loserStats });

      // Get final statistics
      const finalWinnerStats = await getUserStatistics(winner);
      const finalLoserStats = await getUserStatistics(loser);
      logTestStep('GAME_COMPLETION', 'Final statistics retrieved', {
        winner: finalWinnerStats,
        loser: finalLoserStats
      });

      testResults.gameCompletion = {
        success: true,
        message: 'Game completion simulation successful',
        winner: {
          user: winner,
          initialStats: initialWinnerStats,
          finalStats: finalWinnerStats
        },
        loser: {
          user: loser,
          initialStats: initialLoserStats,
          finalStats: finalLoserStats
        }
      };
      logTestStep('GAME_COMPLETION', 'Game completion test successful');

    } catch (error) {
      logTestError('GAME_COMPLETION', error, { 
        winner: 'player1',
        loser: 'player2',
        operation: 'game_completion_test'
      });
      testResults.gameCompletion = {
        success: false,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
    }

    // 5. POST-GAME TESTS
    logTestStep('POST_GAME', 'Starting post-game tests...');
    try {
      // Test retrieving top players
      logTestStep('POST_GAME', 'Retrieving top players...');
      const topPlayers = await query(`
        SELECT user_name, wins, losses, draws, total_games 
        FROM game_statistics 
        ORDER BY wins DESC, total_games DESC 
        LIMIT 5
      `);
      logTestStep('POST_GAME', 'Top players retrieved', { 
        count: topPlayers.length,
        players: topPlayers.map(p => ({ user: p.user_name, wins: p.wins }))
      });

      // Test retrieving game history
      logTestStep('POST_GAME', 'Retrieving game history...');
      const gameHistory = await query(`
        SELECT user_name, wins, losses, draws, total_games, updated_at
        FROM game_statistics 
        WHERE total_games > 0
        ORDER BY updated_at DESC
        LIMIT 10
      `);
      logTestStep('POST_GAME', 'Game history retrieved', { 
        count: gameHistory.length,
        recentUpdates: gameHistory.slice(0, 3).map(h => ({ 
          user: h.user_name, 
          totalGames: h.total_games,
          updatedAt: h.updated_at
        }))
      });

      testResults.postGame = {
        success: true,
        message: 'Post-game operations successful',
        topPlayers: topPlayers.length,
        gameHistory: gameHistory.length,
        sampleTopPlayers: topPlayers.slice(0, 3),
        sampleHistory: gameHistory.slice(0, 3)
      };
      logTestStep('POST_GAME', 'Post-game test successful');

    } catch (error) {
      logTestError('POST_GAME', error, { 
        operation: 'post_game_test'
      });
      testResults.postGame = {
        success: false,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
    }

    // 6. SUMMARY
    logTestStep('SUMMARY', 'Generating test summary...');
    const testKeys = ['auth', 'gameCreation', 'gameplay', 'gameCompletion', 'postGame'];
    const passedTests = testKeys.filter(key => 
      testResults[key] && testResults[key].success !== false
    ).length;

    const allTestsPassed = passedTests === testKeys.length;

    testResults.summary = {
      overallSuccess: allTestsPassed,
      totalTests: testKeys.length,
      passedTests: passedTests,
      failedTests: testKeys.length - passedTests,
      timestamp: new Date().toISOString()
    };

    logTestStep('SUMMARY', `Test completed - ${passedTests}/${testKeys.length} tests passed`);
    logTestStep('SUMMARY', `Overall Success: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);

    if (allTestsPassed) {
      logTestStep('SUMMARY', 'All database operations for the complete game flow are working perfectly!');
    } else {
      logTestStep('SUMMARY', 'Some tests failed. Check the detailed logs above for specific issues.');
    }

    return testResults;

  } catch (error) {
    logTestError('TEST_FLOW', error, { 
      operation: 'main_test_flow',
      testResults: testResults
    });
    throw error;
  } finally {
    // Always clean up test data, even if tests fail
    await cleanupTestData();
  }
}

// Run the test
testGameFlow()
  .then(results => {
    logTestStep('FINAL', 'Test execution completed successfully');
    console.log('\n📋 Final Results:', JSON.stringify(results, null, 2));
    process.exit(0);
  })
  .catch(error => {
    logTestError('FINAL', error, { operation: 'test_execution' });
    console.error('❌ Test failed:', error);
    process.exit(1);
  }); 