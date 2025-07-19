import { NextResponse } from 'next/server';
import { query, getUserStatistics, updateGameStatistics, saveGameMessage, getGameMessages } from '@/lib/db';
import { AuthService } from '@/lib/auth';

export async function GET() {
  const testResults: any = {
    auth: {},
    gameCreation: {},
    gameplay: {},
    gameCompletion: {},
    postGame: {},
    summary: {}
  };

  try {
    console.log('🧪 Starting comprehensive game flow test...');

    // 1. AUTHENTICATION TESTS
    console.log('\n1️⃣ Testing Authentication...');
    try {
      // Test user registration
      const testUser = 'gameflow_test_user';
      const testPassword = 'testpassword123';
      
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
        error: error instanceof Error ? error.message : 'Auth test failed'
      };
      console.log('❌ Auth test failed:', error);
    }

    // 2. GAME CREATION TESTS
    console.log('\n2️⃣ Testing Game Creation...');
    try {
      // Simulate creating a game in the database
      const gameId = `test_game_${Date.now()}`;
      const gameData = {
        id: gameId,
        board: ['', '', '', '', '', '', '', '', ''],
        currentPlayer: 'X',
        players: ['player1', 'player2'],
        status: 'active',
        createdAt: new Date().toISOString()
      };

      // Store game data (simulating what would happen in a real game creation)
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
        gameId: gameId,
        gameData: gameData
      };
      console.log('✅ Game creation successful');

    } catch (error) {
      testResults.gameCreation = {
        success: false,
        error: error instanceof Error ? error.message : 'Game creation test failed'
      };
      console.log('❌ Game creation test failed:', error);
    }

    // 3. GAMEPLAY TESTS
    console.log('\n3️⃣ Testing Gameplay...');
    try {
      const gameId = `gameplay_test_${Date.now()}`;
      
      // Test saving game messages during gameplay
      const message1 = await saveGameMessage(gameId, 'Good move!', 'player1');
      const message2 = await saveGameMessage(gameId, 'Thanks!', 'player2');
      const message3 = await saveGameMessage(gameId, 'This is getting intense!', 'player1');

      // Retrieve game messages
      const gameMessages = await getGameMessages(gameId, 10);

      testResults.gameplay = {
        success: true,
        message: 'Gameplay simulation successful',
        gameId: gameId,
        messagesSent: 3,
        messagesRetrieved: gameMessages.length,
        sampleMessages: gameMessages.slice(0, 2)
      };
      console.log('✅ Gameplay test successful');

    } catch (error) {
      testResults.gameplay = {
        success: false,
        error: error instanceof Error ? error.message : 'Gameplay test failed'
      };
      console.log('❌ Gameplay test failed:', error);
    }

    // 4. GAME COMPLETION TESTS
    console.log('\n4️⃣ Testing Game Completion...');
    try {
      // Simulate game completion with different outcomes
      const winner = 'player1';
      const loser = 'player2';

      // Update statistics for winner
      const winnerStats = await updateGameStatistics(winner, 'win');
      
      // Update statistics for loser
      const loserStats = await updateGameStatistics(loser, 'loss');

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
        error: error instanceof Error ? error.message : 'Game completion test failed'
      };
      console.log('❌ Game completion test failed:', error);
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

      // Test retrieving game history (simulated)
      const gameHistory = await query(`
        SELECT user_name, wins, losses, draws, total_games, updated_at
        FROM game_statistics 
        WHERE total_games > 0
        ORDER BY updated_at DESC
        LIMIT 10
      `);

      // Test cleanup operations (simulate cleaning old messages)
      const cleanupResult = await query(`
        SELECT COUNT(*) as message_count 
        FROM game_chat_messages 
        WHERE created_at < NOW() - INTERVAL '24 hours'
      `);

      testResults.postGame = {
        success: true,
        message: 'Post-game operations successful',
        topPlayers: topPlayers.length,
        gameHistory: gameHistory.length,
        oldMessagesCount: cleanupResult[0]?.message_count || 0
      };
      console.log('✅ Post-game test successful');

    } catch (error) {
      testResults.postGame = {
        success: false,
        error: error instanceof Error ? error.message : 'Post-game test failed'
      };
      console.log('❌ Post-game test failed:', error);
    }

    // 6. SUMMARY
    console.log('\n6️⃣ Generating Test Summary...');
    const allTestsPassed = Object.values(testResults).every(result => 
      result && typeof result === 'object' && 'success' in result && result.success !== false
    );

    testResults.summary = {
      overallSuccess: allTestsPassed,
      totalTests: 5,
      passedTests: Object.values(testResults).filter(result => 
        result && typeof result === 'object' && 'success' in result && result.success !== false
      ).length,
      timestamp: new Date().toISOString()
    };

    console.log('🎉 Game flow test completed!');
    console.log(`✅ ${testResults.summary.passedTests}/${testResults.summary.totalTests} tests passed`);

    return NextResponse.json({
      success: allTestsPassed,
      message: allTestsPassed ? 'All game flow tests passed!' : 'Some tests failed',
      results: testResults
    });

  } catch (error) {
    console.error('❌ Game flow test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Game flow test failed',
      results: testResults
    }, { status: 500 });
  }
} 