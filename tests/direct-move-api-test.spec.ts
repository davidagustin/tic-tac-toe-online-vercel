import { expect, test } from '@playwright/test';

test.describe('Direct Move API Test', () => {
  test('Test move API directly without UI', async ({ request }) => {
    console.log('🧪 Starting direct move API test...');

    // Clean up before test starts
    try {
      await request.post('http://localhost:3000/api/clear-db');
      console.log('🧹 Cleaned up database before test');
    } catch (error) {
      console.log('⚠️ Could not clean database before test:', error);
    }

    // Step 1: Create a game
    console.log('🎮 Step 1: Creating a game...');
    const createResponse = await request.post('http://localhost:3000/api/game/create', {
      data: {
        gameName: 'Direct Move Test Game',
        userName: 'TestPlayer1'
      }
    });

    expect(createResponse.ok()).toBeTruthy();
    const createData = await createResponse.json();
    const gameId = createData.game.id;
    console.log('✅ Game created with ID:', gameId);
    console.log('✅ Game status:', createData.game.status);
    console.log('✅ Game players:', createData.game.players);

    // Step 2: Add a second player to make the game playable
    console.log('🎮 Step 2: Adding second player...');
    const joinResponse = await request.post('http://localhost:3000/api/game/join', {
      data: {
        gameId: gameId,
        userName: 'TestPlayer2'
      }
    });

    console.log('🎮 Join response status:', joinResponse.status());
    console.log('🎮 Join response ok:', joinResponse.ok());

    if (!joinResponse.ok()) {
      const errorData = await joinResponse.json();
      console.log('❌ Join API error:', errorData);
      throw new Error(`Join API failed: ${JSON.stringify(errorData)}`);
    }

    const joinData = await joinResponse.json();
    console.log('✅ Second player joined');
    console.log('✅ Game status after join:', joinData.game.status);
    console.log('✅ Game players after join:', joinData.game.players);
    console.log('✅ Current player:', joinData.game.currentPlayer);

    // Verify game is now in playing state
    expect(joinData.game.status).toBe('playing');
    expect(joinData.game.players).toHaveLength(2);
    expect(joinData.game.currentPlayer).toBeTruthy();

    // Step 3: Make a move
    console.log('🎮 Step 3: Making a move...');
    console.log('🎮 Move request data:', {
      gameId: gameId,
      index: 0,
      player: joinData.game.currentPlayer
    });

    const moveResponse = await request.post('http://localhost:3000/api/game/move', {
      data: {
        gameId: gameId,
        index: 0, // Top-left corner
        player: joinData.game.currentPlayer // Use the current player
      }
    });

    console.log('🎮 Move response status:', moveResponse.status());
    console.log('🎮 Move response ok:', moveResponse.ok());

    if (!moveResponse.ok()) {
      const errorData = await moveResponse.json();
      console.log('❌ Move API error:', errorData);
      throw new Error(`Move API failed: ${JSON.stringify(errorData)}`);
    }

    const moveData = await moveResponse.json();
    console.log('✅ Move made successfully');
    console.log('✅ Game board after move:', moveData.game.board);
    console.log('✅ Current player after move:', moveData.game.currentPlayer);
    console.log('✅ Game status after move:', moveData.game.status);

    // Verify the move was recorded
    expect(moveData.game.board[0]).toBe(joinData.game.currentPlayer);

    // Verify turn switched (unless game ended)
    if (moveData.game.status === 'playing') {
      expect(moveData.game.currentPlayer).not.toBe(joinData.game.currentPlayer);
    }

    // Step 4: Make another move with the other player
    console.log('🎮 Step 4: Making second move...');
    const secondMoveResponse = await request.post('http://localhost:3000/api/game/move', {
      data: {
        gameId: gameId,
        index: 4, // Center
        player: moveData.game.currentPlayer
      }
    });

    if (!secondMoveResponse.ok()) {
      const errorData = await secondMoveResponse.json();
      console.log('❌ Second move API error:', errorData);
      throw new Error(`Second move API failed: ${JSON.stringify(errorData)}`);
    }

    const secondMoveData = await secondMoveResponse.json();
    console.log('✅ Second move made successfully');
    console.log('✅ Game board after second move:', secondMoveData.game.board);
    console.log('✅ Current player after second move:', secondMoveData.game.currentPlayer);

    // Verify the second move was recorded
    expect(secondMoveData.game.board[4]).toBe(moveData.game.currentPlayer);

    console.log('🏁 Direct move API test completed successfully!');
  });
}); 