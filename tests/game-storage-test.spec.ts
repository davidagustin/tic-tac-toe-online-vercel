import { expect, test } from '@playwright/test';

test.describe('Game Storage Test', () => {
  test('Test game storage functionality', async ({ request }) => {
    console.log('🧪 Starting game storage test...');

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
        gameName: 'Storage Test Game',
        userName: 'TestPlayer1'
      }
    });

    expect(createResponse.ok()).toBeTruthy();
    const createData = await createResponse.json();
    const gameId = createData.game.id;
    console.log('✅ Game created with ID:', gameId);
    console.log('✅ Game status:', createData.game.status);
    console.log('✅ Game players:', createData.game.players);
    console.log('✅ Game createdAt:', createData.game.createdAt);

    // Step 2: Verify game can be retrieved immediately
    console.log('🎮 Step 2: Verifying game can be retrieved...');
    const getResponse1 = await request.get(`http://localhost:3000/api/games/${gameId}`);
    console.log('🎮 Get response status:', getResponse1.status());
    console.log('🎮 Get response ok:', getResponse1.ok());

    if (!getResponse1.ok()) {
      const errorData = await getResponse1.json();
      console.log('❌ Get API error:', errorData);
      throw new Error(`Get API failed: ${JSON.stringify(errorData)}`);
    }

    const getData1 = await getResponse1.json();
    console.log('✅ Game retrieved successfully');
    console.log('✅ Retrieved game status:', getData1.status);
    console.log('✅ Retrieved game players:', getData1.players);

    // Step 3: Add a second player
    console.log('🎮 Step 3: Adding second player...');
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

    // Step 4: Verify game can still be retrieved after join
    console.log('🎮 Step 4: Verifying game can be retrieved after join...');
    const getResponse2 = await request.get(`http://localhost:3000/api/games/${gameId}`);
    expect(getResponse2.ok()).toBeTruthy();
    const getData2 = await getResponse2.json();
    console.log('✅ Game retrieved after join successfully');
    console.log('✅ Retrieved game status:', getData2.status);
    console.log('✅ Retrieved game players:', getData2.players);
    console.log('✅ Retrieved current player:', getData2.currentPlayer);

    // Step 5: Make a move
    console.log('🎮 Step 5: Making a move...');
    const moveResponse = await request.post('http://localhost:3000/api/game/move', {
      data: {
        gameId: gameId,
        index: 0,
        player: joinData.game.currentPlayer
      }
    });

    expect(moveResponse.ok()).toBeTruthy();
    const moveData = await moveResponse.json();
    console.log('✅ Move made successfully');
    console.log('✅ Game status after move:', moveData.game.status);
    console.log('✅ Game board after move:', moveData.game.board);
    console.log('✅ Current player after move:', moveData.game.currentPlayer);

    // Step 6: Verify game can still be retrieved after move
    console.log('🎮 Step 6: Verifying game can be retrieved after move...');
    const getResponse3 = await request.get(`http://localhost:3000/api/games/${gameId}`);
    expect(getResponse3.ok()).toBeTruthy();
    const getData3 = await getResponse3.json();
    console.log('✅ Game retrieved after move successfully');
    console.log('✅ Retrieved game status:', getData3.status);
    console.log('✅ Retrieved game board:', getData3.board);
    console.log('✅ Retrieved current player:', getData3.currentPlayer);

    // Step 7: Verify the move was recorded
    expect(getData3.board[0]).toBe(joinData.game.currentPlayer);
    expect(getData3.currentPlayer).not.toBe(joinData.game.currentPlayer);

    console.log('🏁 Game storage test completed successfully!');
  });
}); 