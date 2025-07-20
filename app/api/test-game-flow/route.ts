import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { query, getUserStatistics, updateGameStatistics } from '@/lib/db';

// Enhanced logging function
function logTestStep(step: string, message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  console.log(`[TEST_GAME_FLOW] [${timestamp}] [${step}] ${message}`, data || '');
}

function logTestError(step: string, error: unknown, context?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  console.error(`[TEST_GAME_FLOW] [${timestamp}] [${step}] ERROR:`, error, context || '');
}

export async function GET(request: NextRequest) {
  try {
    logTestStep('TEST_START', 'Starting comprehensive game flow test...');
    
    const testUser = 'api_test_user';
    const testGameId = `test_game_${Date.now()}`;
    
    // Test 1: User Registration Simulation
    logTestStep('USER_REGISTRATION', `Simulating user registration for: ${testUser}`);
    const userExists = await query('SELECT 1 FROM users WHERE username = $1', [testUser]);
    if (userExists.length === 0) {
      await query(
        'INSERT INTO users (username, password_hash, created_at) VALUES ($1, $2, NOW())',
        [testUser, 'test_hash']
      );
      logTestStep('USER_REGISTRATION', 'Test user created successfully');
    } else {
      logTestStep('USER_REGISTRATION', 'Test user already exists');
    }
    
    // Test 2: Game Creation Simulation
    logTestStep('GAME_CREATION', `Creating test game: ${testGameId}`);
    await query(
      'INSERT INTO games (id, name, status, players, board, created_by, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())',
      [testGameId, 'Test Game', 'waiting', [testUser], Array(9).fill(''), testUser]
    );
    logTestStep('GAME_CREATION', 'Test game created successfully');
    
    // Test 3: Game Join Simulation
    logTestStep('GAME_JOIN', 'Simulating second player joining game');
    const secondPlayer = 'test_player_2';
    await query(
      'UPDATE games SET players = array_append(players, $1), status = $2, updated_at = NOW() WHERE id = $3',
      [secondPlayer, 'playing', testGameId]
    );
    logTestStep('GAME_JOIN', 'Second player joined successfully');
    
    // Test 4: Game Moves Simulation
    logTestStep('GAME_MOVES', 'Simulating game moves');
    const moves = [
      { position: 0, player: testUser, symbol: 'X' },
      { position: 4, player: secondPlayer, symbol: 'O' },
      { position: 1, player: testUser, symbol: 'X' },
      { position: 2, player: secondPlayer, symbol: 'O' },
      { position: 8, player: testUser, symbol: 'X' },
    ];
    
    let board = Array(9).fill('');
    for (const move of moves) {
      board = [...board.slice(0, move.position), move.symbol, ...board.slice(move.position + 1)];
      await query(
        'UPDATE games SET board = $1, current_player = $2, updated_at = NOW() WHERE id = $3',
        [board, move.player === testUser ? 'O' : 'X', testGameId]
      );
      logTestStep('GAME_MOVE', `Move made: ${move.symbol} at position ${move.position}`);
    }
    
    // Test 5: Game End Simulation (X wins)
    logTestStep('GAME_END', 'Simulating game end with X win');
    await query(
      'UPDATE games SET status = $1, winner = $2, updated_at = NOW() WHERE id = $3',
      ['finished', testUser, testGameId]
    );
    logTestStep('GAME_END', 'Game ended successfully');
    
    // Test 6: Statistics Update
    logTestStep('STATS_UPDATE', 'Testing statistics update');
    await updateGameStatistics(testUser, 'win');
    await updateGameStatistics(secondPlayer, 'loss');
    logTestStep('STATS_UPDATE', 'Statistics updated successfully');
    
    // Test 7: Chat Messages
    logTestStep('CHAT_MESSAGES', 'Testing chat functionality');
    const chatMessages = [
      { text: 'Hello!', userName: testUser },
      { text: 'Hi there!', userName: secondPlayer },
      { text: 'Good game!', userName: testUser },
    ];
    
    for (const msg of chatMessages) {
      await query(
        'INSERT INTO chat_messages (game_id, text, user_name, timestamp) VALUES ($1, $2, $3, NOW())',
        [testGameId, msg.text, msg.userName]
      );
    }
    logTestStep('CHAT_MESSAGES', 'Chat messages created successfully');
    
    // Test 8: Final Statistics Check
    logTestStep('STATS_FINAL', 'Checking final statistics');
    const finalStats = await getUserStatistics(testUser);
    logTestStep('STATS_FINAL', 'Final statistics retrieved', { finalStats });
    
    // Cleanup
    logTestStep('CLEANUP', 'Cleaning up test data...');
    await query('DELETE FROM chat_messages WHERE game_id = $1', [testGameId]);
    await query('DELETE FROM games WHERE id = $1', [testGameId]);
    await query('DELETE FROM game_statistics WHERE user_name IN ($1, $2)', [testUser, secondPlayer]);
    await query('DELETE FROM users WHERE username IN ($1, $2)', [testUser, secondPlayer]);
    logTestStep('CLEANUP', 'Test data cleaned up successfully');
    
    logTestStep('TEST_SUCCESS', 'Comprehensive game flow test completed successfully!');
    
    return NextResponse.json({
      success: true,
      message: 'Comprehensive game flow test completed successfully',
      testResults: {
        userRegistration: 'OK',
        gameCreation: 'OK',
        gameJoining: 'OK',
        gameMoves: 'OK',
        gameEnd: 'OK',
        statistics: 'OK',
        chatMessages: 'OK',
        cleanup: 'OK'
      },
      finalStats,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error: unknown) {
    logTestError('TEST_GAME_FLOW', error, { 
      operation: 'comprehensive_game_flow_test'
    });
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Game flow test failed',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
} 