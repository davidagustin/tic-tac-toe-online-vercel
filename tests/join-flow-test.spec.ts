import { test, expect } from '@playwright/test';

test.describe('Join Flow Test', () => {
  test('Test the complete join flow with timing verification', async ({ request }) => {
    console.log('🧪 Starting join flow test...');
    
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
        gameName: 'Join Flow Test Game',
        userName: 'TestPlayer1'
      }
    });
    
    expect(createResponse.ok()).toBeTruthy();
    const createData = await createResponse.json();
    const gameId = createData.game.id;
    console.log('✅ Game created with ID:', gameId);
    console.log('✅ Game status:', createData.game.status);
    console.log('✅ Game players:', createData.game.players);
    
    // Step 2: Simulate the join flow
    console.log('🎮 Step 2: Simulating join flow...');
    
    // First, fetch the game data (simulating what happens when Game component mounts)
    console.log('🔍 Fetching game data before join...');
    const getBeforeJoinResponse = await request.get(`http://localhost:3000/api/games/${gameId}`);
    expect(getBeforeJoinResponse.ok()).toBeTruthy();
    const getBeforeJoinData = await getBeforeJoinResponse.json();
    console.log('✅ Game data before join - status:', getBeforeJoinData.status);
    console.log('✅ Game data before join - players:', getBeforeJoinData.players);
    console.log('✅ Game data before join - currentPlayer:', getBeforeJoinData.currentPlayer);
    
    // Verify game is still in waiting state
    expect(getBeforeJoinData.status).toBe('waiting');
    expect(getBeforeJoinData.players).toHaveLength(1);
    expect(getBeforeJoinData.currentPlayer).toBeNull();
    
    // Now join the game (simulating the join API call)
    console.log('🔍 Joining the game...');
    const joinResponse = await request.post('http://localhost:3000/api/game/join', {
      data: {
        gameId: gameId,
        userName: 'TestPlayer2'
      }
    });
    
    expect(joinResponse.ok()).toBeTruthy();
    const joinData = await joinResponse.json();
    console.log('✅ Join API response - status:', joinData.game.status);
    console.log('✅ Join API response - players:', joinData.game.players);
    console.log('✅ Join API response - currentPlayer:', joinData.game.currentPlayer);
    
    // Verify game is now in playing state
    expect(joinData.game.status).toBe('playing');
    expect(joinData.game.players).toHaveLength(2);
    expect(joinData.game.currentPlayer).toBeTruthy();
    
    // Step 3: Simulate fetching game data after join (what Game component does)
    console.log('🎮 Step 3: Fetching game data after join...');
    
    // Add a small delay to simulate the time it takes for the Game component to mount
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const getAfterJoinResponse = await request.get(`http://localhost:3000/api/games/${gameId}`);
    expect(getAfterJoinResponse.ok()).toBeTruthy();
    const getAfterJoinData = await getAfterJoinResponse.json();
    console.log('✅ Game data after join - status:', getAfterJoinData.status);
    console.log('✅ Game data after join - players:', getAfterJoinData.players);
    console.log('✅ Game data after join - currentPlayer:', getAfterJoinData.currentPlayer);
    
    // Verify the game data is consistent
    expect(getAfterJoinData.status).toBe('playing');
    expect(getAfterJoinData.players).toHaveLength(2);
    expect(getAfterJoinData.currentPlayer).toBe(joinData.game.currentPlayer);
    
    // Step 4: Verify that both players are in the game
    console.log('🎮 Step 4: Verifying both players are in the game...');
    expect(getAfterJoinData.players).toContain('TestPlayer1');
    expect(getAfterJoinData.players).toContain('TestPlayer2');
    
    console.log('🏁 Join flow test completed successfully!');
  });
}); 