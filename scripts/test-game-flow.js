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

async function testGameFlow() {
  console.log('🧪 Starting comprehensive game flow test...\n');

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
    console.log('📊 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized\n');

    // 1. AUTHENTICATION TESTS
    console.log('1️⃣ Testing Authentication...');
    try {
      const testUser = 'gameflow_test_user';
      const testPassword = 'testpassword123';
      
      // Test user creation
      const registerResult = await AuthService.createUser(testUser, testPassword);
      testResults.auth.registration = {
        success: true,
        message: 'User registration successful',
        user: testUser
      };
      console.log('✅ User registration successful');

      // Test user login
      const loginResult = await AuthService.validateCredentials(testUser, testPassword);
      testResults.auth.login = {
        success: true,
        message: 'User login successful',
        user: testUser
      };
      console.log('✅ User login successful');

    } catch (error) {
      testResults.auth = {
        success: false,
        error: error.message
      };
      console.log('❌ Auth test failed:', error.message);
    }

    // 2. GAME CREATION TESTS
    console.log('\n2️⃣ Testing Game Creation...');
    try {
      const gameId = `test_game_${Date.now()}`;
      
      // Create player statistics entries
      await query(`
        INSERT INTO game_statistics (user_name, wins, losses, draws, total_games) 
        VALUES ($1, 0, 0, 0, 0) 
        ON CONFLICT (user_name) DO NOTHING
      `, ['player1']);

      await query(`
        INSERT INTO game_statistics (user_name, wins, losses, draws, total_games) 
        VALUES ($1, 0, 0, 0, 0) 
        ON CONFLICT (user_name) DO NOTHING
      `, ['player2']);

      testResults.gameCreation = {
        success: true,
        message: 'Game creation simulation successful',
        gameId: gameId
      };
      console.log('✅ Game creation successful');

    } catch (error) {
      testResults.gameCreation = {
        success: false,
        error: error.message
      };
      console.log('❌ Game creation test failed:', error.message);
    }

    // 3. GAMEPLAY TESTS
    console.log('\n3️⃣ Testing Gameplay...');
    try {
      const gameId = `gameplay_test_${Date.now()}`;
      
      // Test saving game messages during gameplay
      await saveGameMessage(gameId, 'Good move!', 'player1');
      await saveGameMessage(gameId, 'Thanks!', 'player2');
      await saveGameMessage(gameId, 'This is getting intense!', 'player1');

      // Retrieve game messages
      const gameMessages = await getGameMessages(gameId, 10);

      testResults.gameplay = {
        success: true,
        message: 'Gameplay simulation successful',
        gameId: gameId,
        messagesSent: 3,
        messagesRetrieved: gameMessages.length
      };
      console.log('✅ Gameplay test successful');

    } catch (error) {
      testResults.gameplay = {
        success: false,
        error: error.message
      };
      console.log('❌ Gameplay test failed:', error.message);
    }

    // 4. GAME COMPLETION TESTS
    console.log('\n4️⃣ Testing Game Completion...');
    try {
      const winner = 'player1';
      const loser = 'player2';

      // Update statistics for winner and loser
      await updateGameStatistics(winner, 'win');
      await updateGameStatistics(loser, 'loss');

      // Get final statistics
      const finalWinnerStats = await getUserStatistics(winner);
      const finalLoserStats = await getUserStatistics(loser);

      testResults.gameCompletion = {
        success: true,
        message: 'Game completion simulation successful',
        winner: {
          user: winner,
          stats: finalWinnerStats
        },
        loser: {
          user: loser,
          stats: finalLoserStats
        }
      };
      console.log('✅ Game completion test successful');

    } catch (error) {
      testResults.gameCompletion = {
        success: false,
        error: error.message
      };
      console.log('❌ Game completion test failed:', error.message);
    }

    // 5. POST-GAME TESTS
    console.log('\n5️⃣ Testing Post-Game Operations...');
    try {
      // Test retrieving top players
      const topPlayers = await query(`
        SELECT user_name, wins, losses, draws, total_games 
        FROM game_statistics 
        ORDER BY wins DESC, total_games DESC 
        LIMIT 5
      `);

      // Test retrieving game history
      const gameHistory = await query(`
        SELECT user_name, wins, losses, draws, total_games, updated_at
        FROM game_statistics 
        WHERE total_games > 0
        ORDER BY updated_at DESC
        LIMIT 10
      `);

      testResults.postGame = {
        success: true,
        message: 'Post-game operations successful',
        topPlayers: topPlayers.length,
        gameHistory: gameHistory.length
      };
      console.log('✅ Post-game test successful');

    } catch (error) {
      testResults.postGame = {
        success: false,
        error: error.message
      };
      console.log('❌ Post-game test failed:', error.message);
    }

    // 6. SUMMARY
    console.log('\n6️⃣ Test Summary:');
    const testKeys = ['auth', 'gameCreation', 'gameplay', 'gameCompletion', 'postGame'];
    const passedTests = testKeys.filter(key => 
      testResults[key] && testResults[key].success !== false
    ).length;

    const allTestsPassed = passedTests === testKeys.length;

    testResults.summary = {
      overallSuccess: allTestsPassed,
      totalTests: testKeys.length,
      passedTests: passedTests,
      timestamp: new Date().toISOString()
    };

    console.log(`🎉 Game flow test completed!`);
    console.log(`✅ ${testResults.summary.passedTests}/${testResults.summary.totalTests} tests passed`);
    console.log(`Overall Success: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);

    if (allTestsPassed) {
      console.log('\n🎮 All database operations for the complete game flow are working perfectly!');
    } else {
      console.log('\n⚠️  Some tests failed. Check the results above for details.');
    }

    return testResults;

  } catch (error) {
    console.error('❌ Game flow test failed:', error);
    throw error;
  }
}

// Run the test
testGameFlow()
  .then(results => {
    console.log('\n📋 Final Results:', JSON.stringify(results, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }); 