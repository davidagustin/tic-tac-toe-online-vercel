import { test, expect } from '@playwright/test';

test.describe('Simple Move API Test', () => {
  test('Test move API functionality with two players', async ({ browser }) => {
    console.log('🧪 Starting simple move API test with two players...');
    
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
      
      // Create game
      await page1.click('button:has-text("Create Game")');
      await page1.waitForSelector('input[id="gameName"]');
      await page1.fill('input[id="gameName"]', 'Move Test Game');
      await page1.click('button:has-text("Create")');
      
      // Wait for game to load
      await page1.waitForSelector('.grid.grid-cols-3', { timeout: 30000 });
      console.log('✅ Player 1: Game created and loaded');
      
      // Player 2: Register and join game
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
      
      // Wait for the game created by Player 1 to appear
      await page2.waitForSelector(`text=${player1Username}`, { timeout: 15000 });
      console.log('✅ Player 2: Found Player 1 game in lobby');
      
      // Join the game
      const joinButton = page2.locator('button:has-text("Join")').first();
      await joinButton.click();
      console.log('✅ Player 2: Clicked Join button');
      
      // Wait for game to load
      await page2.waitForSelector('.grid.grid-cols-3', { timeout: 30000 });
      console.log('✅ Player 2: Joined game successfully');
      
      // Wait for both players to be in the game
      await page1.locator('h3:has-text("Players")').locator('..').locator(`text=${player2Username}`).waitFor({ timeout: 15000 });
      await page2.locator('h3:has-text("Players")').locator('..').locator(`text=${player1Username}`).waitFor({ timeout: 15000 });
      console.log('✅ Both players are in the game');
      
      // Wait for game to start and detect whose turn it is
      console.log('🎮 Waiting for game to start...');
      
      // Check if "Your turn!" is visible on either page
      const player1TurnText = page1.locator('text=Your turn!');
      const player2TurnText = page2.locator('text=Your turn!');
      
      const isPlayer1Turn = await player1TurnText.isVisible();
      const isPlayer2Turn = await player2TurnText.isVisible();
      
      console.log('🔍 Player 1 "Your turn!" visible:', isPlayer1Turn);
      console.log('🔍 Player 2 "Your turn!" visible:', isPlayer2Turn);
      
      // Wait for at least one player to have their turn
      if (!isPlayer1Turn && !isPlayer2Turn) {
        console.log('⚠️ Neither player shows "Your turn!" - waiting for game state to update...');
        await page1.waitForTimeout(5000);
        
        // Check again
        const isPlayer1TurnAfter = await player1TurnText.isVisible();
        const isPlayer2TurnAfter = await player2TurnText.isVisible();
        console.log('🔍 After wait - Player 1 "Your turn!" visible:', isPlayer1TurnAfter);
        console.log('🔍 After wait - Player 2 "Your turn!" visible:', isPlayer2TurnAfter);
        
        if (!isPlayer1TurnAfter && !isPlayer2TurnAfter) {
          throw new Error('No player has their turn after waiting - game state issue');
        }
      }
      
      // Determine the first player and their symbol
      let firstPlayer, firstSymbol;
      if (isPlayer1Turn) {
        firstPlayer = page1;
        firstSymbol = 'X';
        console.log('🎮 Player 1 goes first (X)');
      } else {
        firstPlayer = page2;
        firstSymbol = 'O';
        console.log('🎮 Player 2 goes first (O)');
      }
      
      // First player makes move (top-left)
      console.log(`🎮 First player making move (${firstSymbol})...`);
      const cell0 = firstPlayer.locator('.grid.grid-cols-3 button').nth(0);
      
      // Check if the cell is clickable
      const isCell0Enabled = await cell0.isEnabled();
      console.log('🔍 Cell 0 enabled:', isCell0Enabled);
      
      if (!isCell0Enabled) {
        console.log('❌ Cell 0 is not enabled - cannot make move');
        throw new Error('Cell is not enabled for clicking');
      }
      
      await cell0.click();
      console.log('✅ Cell 0 clicked');
      
      // Wait a bit for the move to be processed
      await firstPlayer.waitForTimeout(2000);
      
      // Check what's actually in the cell after clicking
      const cell0Text = await cell0.textContent();
      console.log('🔍 Cell 0 text after click:', cell0Text);
      
      // Verify the move was made
      if (cell0Text && cell0Text.trim() !== '') {
        console.log('✅ Move was successful - cell contains:', cell0Text);
      } else {
        console.log('❌ Move failed - cell is empty');
        throw new Error('Move was not processed - cell is empty');
      }
      
      // Wait for the move to be reflected on both players' boards
      await firstPlayer.waitForSelector(`.grid.grid-cols-3 button:nth-child(1):has-text("${firstSymbol}")`, { timeout: 10000 });
      console.log(`✅ First player (${firstSymbol}) move completed`);
      
      console.log('🏁 Simple move API test completed successfully!');
      
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