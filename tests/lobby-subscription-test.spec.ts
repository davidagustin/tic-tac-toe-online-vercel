import { test, expect } from '@playwright/test';

test.describe('Lobby Subscription Test', () => {
  test('Test lobby subscription and game visibility', async ({ browser }) => {
    console.log('🧪 Starting lobby subscription test...');
    
    // Clean up before test starts
    try {
      await fetch('http://localhost:3000/api/clear-db', { method: 'POST' });
      console.log('🧹 Cleaned up database before test');
    } catch (error) {
      console.log('⚠️ Could not clean database before test:', error);
    }
    
    // Create two browser contexts for two players
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      // Player 1: Register and create game
      console.log('👤 Player 1: Starting registration...');
      const player1Username = `P1${Date.now() % 1000}`;
      await page1.goto('http://localhost:3000');
      await page1.waitForSelector('[data-testid="submit-button"]');
      await page1.click('button:has-text("Create New Account")');
      await page1.waitForSelector('[data-testid="username-input"]');
      await page1.fill('[data-testid="username-input"]', player1Username);
      await page1.fill('[data-testid="password-input"]', 'password123');
      await page1.click('[data-testid="submit-button"]');
      
      // Wait for lobby to appear
      await page1.waitForSelector('button:has-text("Create Game")', { timeout: 15000 });
      console.log('✅ Player 1: Successfully in lobby');
      
      // Player 2: Register and wait in lobby
      console.log('👤 Player 2: Starting registration...');
      const player2Username = `P2${Date.now() % 1000}`;
      await page2.goto('http://localhost:3000');
      await page2.waitForSelector('[data-testid="submit-button"]');
      await page2.click('button:has-text("Create New Account")');
      await page2.waitForSelector('[data-testid="username-input"]');
      await page2.fill('[data-testid="username-input"]', player2Username);
      await page2.fill('[data-testid="password-input"]', 'password123');
      await page2.click('[data-testid="submit-button"]');
      
      // Wait for lobby to appear
      await page2.waitForSelector('button:has-text("Create Game")', { timeout: 15000 });
      console.log('✅ Player 2: Successfully in lobby');
      
      // Player 1: Create game
      console.log('🎮 Player 1: Creating game...');
      await page1.click('button:has-text("Create Game")');
      await page1.waitForSelector('input[id="gameName"]');
      await page1.fill('input[id="gameName"]', 'Lobby Test Game');
      await page1.click('button:has-text("Create")');
      
      // Wait for game to load
      await page1.waitForSelector('.grid.grid-cols-3', { timeout: 30000 });
      console.log('✅ Player 1: Game created and loaded');
      
      // Player 2: Wait for the game to appear in lobby
      console.log('🔍 Player 2: Waiting for Player 1 game to appear in lobby...');
      
      // Add delay to allow real-time updates to propagate
      console.log('⏳ Waiting 5 seconds for real-time updates to propagate...');
      await page2.waitForTimeout(5000);
      
      // Check if the game appears in Player 2's lobby
      const gameElement = page2.locator(`text=${player1Username}`);
      const isGameVisible = await gameElement.isVisible();
      console.log('🔍 Game visible in Player 2 lobby:', isGameVisible);
      
      if (!isGameVisible) {
        console.log('❌ Game not visible in Player 2 lobby');
        
        // Check what's actually in the lobby
        const allGames = page2.locator('div:has-text("Created by:")');
        const gameCount = await allGames.count();
        console.log('🔍 Total games in Player 2 lobby:', gameCount);
        
        for (let i = 0; i < gameCount; i++) {
          const gameText = await allGames.nth(i).textContent();
          console.log(`🔍 Game ${i}: "${gameText}"`);
        }
        
        // Try refreshing the page
        console.log('🔄 Player 2: Refreshing page...');
        await page2.reload();
        await page2.waitForSelector('button:has-text("Create Game")', { timeout: 15000 });
        
        // Wait again for games to appear
        await page2.waitForTimeout(3000);
        
        const gameElementAfterRefresh = page2.locator(`text=${player1Username}`);
        const isGameVisibleAfterRefresh = await gameElementAfterRefresh.isVisible();
        console.log('🔍 Game visible after refresh:', isGameVisibleAfterRefresh);
        
        if (!isGameVisibleAfterRefresh) {
          throw new Error('Game not visible in lobby even after refresh - lobby subscription issue');
        }
      }
      
      console.log('✅ Game is visible in Player 2 lobby');
      
      // Player 2: Join the game
      console.log('👤 Player 2: Joining the game...');
      const joinButton = page2.locator('button:has-text("Join")').first();
      await joinButton.click();
      
      // Wait for game to load
      await page2.waitForSelector('.grid.grid-cols-3', { timeout: 30000 });
      console.log('✅ Player 2: Joined game successfully');
      
      // Verify both players are in the game
      await page1.locator('h3:has-text("Players")').locator('..').locator(`text=${player2Username}`).waitFor({ timeout: 15000 });
      await page2.locator('h3:has-text("Players")').locator('..').locator(`text=${player1Username}`).waitFor({ timeout: 15000 });
      console.log('✅ Both players are in the game');
      
      // Verify game is in playing state
      const gameStatus1 = page1.locator('h3:has-text("Game Status")').locator('..').locator('p').first();
      const gameStatus2 = page2.locator('h3:has-text("Game Status")').locator('..').locator('p').first();
      
      const status1 = await gameStatus1.textContent();
      const status2 = await gameStatus2.textContent();
      console.log('🔍 Player 1 game status:', status1);
      console.log('🔍 Player 2 game status:', status2);
      
      if (status1 !== 'playing' || status2 !== 'playing') {
        throw new Error('Game is not in playing state after both players joined');
      }
      
      console.log('✅ Game is in playing state');
      
      // Check if at least one player has their turn
      const player1TurnText = page1.locator('text=Your turn!');
      const player2TurnText = page2.locator('text=Your turn!');
      
      const isPlayer1Turn = await player1TurnText.isVisible();
      const isPlayer2Turn = await player2TurnText.isVisible();
      
      console.log('🔍 Player 1 "Your turn!" visible:', isPlayer1Turn);
      console.log('🔍 Player 2 "Your turn!" visible:', isPlayer2Turn);
      
      if (!isPlayer1Turn && !isPlayer2Turn) {
        throw new Error('No player has their turn after game started');
      }
      
      console.log('✅ At least one player has their turn');
      
      console.log('🏁 Lobby subscription test completed successfully!');
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      throw error;
    } finally {
      // Clean up
      await context1.close();
      await context2.close();
    }
  });
}); 