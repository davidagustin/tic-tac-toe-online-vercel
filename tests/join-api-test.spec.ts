import { test, expect } from '@playwright/test';

test.describe('Join API Test', () => {
  test('Test join API functionality', async ({ request }) => {
    console.log('🧪 Starting join API test...');
    
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
        gameName: 'Join API Test Game',
        userName: 'TestPlayer1'
      }
    });
    
    expect(createResponse.ok()).toBeTruthy();
    const createData = await createResponse.json();
    const gameId = createData.game.id;
    console.log('✅ Game created with ID:', gameId);
    console.log('✅ Game status:', createData.game.status);
    console.log('✅ Game players:', createData.game.players);
    
    // Verify game is in waiting state
    expect(createData.game.status).toBe('waiting');
    expect(createData.game.players).toHaveLength(1);
    expect(createData.game.currentPlayer).toBeNull();
    
    // Step 2: Add a second player
    console.log('🎮 Step 2: Adding second player...');
    const joinResponse = await request.post('http://localhost:3000/api/game/join', {
      data: {
        gameId: gameId,
        userName: 'TestPlayer2'
      }
    });
    
    expect(joinResponse.ok()).toBeTruthy();
    const joinData = await joinResponse.json();
    console.log('✅ Second player joined');
    console.log('✅ Game status after join:', joinData.game.status);
    console.log('✅ Game players after join:', joinData.game.players);
    console.log('✅ Current player:', joinData.game.currentPlayer);
    
    // Verify game is now in playing state
    expect(joinData.game.status).toBe('playing');
    expect(joinData.game.players).toHaveLength(2);
    expect(joinData.game.currentPlayer).toBeTruthy();
    expect(['X', 'O']).toContain(joinData.game.currentPlayer);
    
    // Step 3: Verify the game data is persisted
    console.log('🎮 Step 3: Verifying game data persistence...');
    const getResponse = await request.get(`http://localhost:3000/api/games/${gameId}`);
    
    expect(getResponse.ok()).toBeTruthy();
    const getData = await getResponse.json();
    console.log('✅ Retrieved game data');
    console.log('✅ Game status from get:', getData.status);
    console.log('✅ Game players from get:', getData.players);
    console.log('✅ Current player from get:', getData.currentPlayer);
    
    // Verify the game data is consistent
    expect(getData.status).toBe('playing');
    expect(getData.players).toHaveLength(2);
    expect(getData.currentPlayer).toBe(joinData.game.currentPlayer);
    
    console.log('🏁 Join API test completed successfully!');
  });
}); 