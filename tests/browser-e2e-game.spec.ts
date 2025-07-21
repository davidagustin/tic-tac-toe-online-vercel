import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// Generate unique usernames for each test run
function uniqueUsername(prefix: string) {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

const PLAYER1 = { username: uniqueUsername('p1') };
const PLAYER2 = { username: uniqueUsername('p2') };

test.describe('Browser E2E: Two Players Full Game Flow', () => {
  test('Two players play a full game with visible browser UI', async ({ browser }) => {
    // Create two separate browser contexts for the two players
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      // Clear database before test
      console.log('🧹 Clearing database before test...');
      const clearResponse = await fetch(`${BASE_URL}/api/clear-db`, { method: 'POST' });
      const clearResult = await clearResponse.json();
      console.log('🧹 Database cleared successfully:', clearResult);

      // --- Player 1 Registration ---
      console.log('Player 1 registering:', PLAYER1.username);
      await page1.goto(BASE_URL);
      
      // Wait for the page to load
      await page1.waitForSelector('input#username', { timeout: 10000 });
      console.log('Player 1: Username input found');
      
      // Switch to registration mode first (Auth component starts in login mode)
      await page1.click('button:has-text("Don\'t have an account? Sign up")');
      console.log('Player 1 switched to registration mode');
      
      // Wait for the form to update
      await page1.waitForTimeout(1000);
      
      // Fill registration form
      await page1.fill('#username', PLAYER1.username);
      await page1.fill('#password', 'password123');
      console.log('Player 1: Form filled');
      
      // Submit registration
      await page1.click('button:has-text("🎯 Create Account")');
      console.log('Player 1 registration submitted');
      
      // Wait for registration to complete and redirect to lobby
      await page1.waitForSelector('text=Welcome, ' + PLAYER1.username + '!', { timeout: 15000 });
      console.log('Player 1 in lobby');

      // Wait a moment to see the lobby
      await page1.waitForTimeout(2000);

      // --- Player 2 Registration ---
      console.log('Player 2 registering:', PLAYER2.username);
      await page2.goto(BASE_URL);
      
      // Wait for the page to load
      await page2.waitForSelector('input#username', { timeout: 10000 });
      console.log('Player 2: Username input found');
      
      // Switch to registration mode first (Auth component starts in login mode)
      await page2.click('button:has-text("Don\'t have an account? Sign up")');
      console.log('Player 2 switched to registration mode');
      
      // Wait for the form to update
      await page2.waitForTimeout(1000);
      
      // Fill registration form
      await page2.fill('#username', PLAYER2.username);
      await page2.fill('#password', 'password123');
      console.log('Player 2: Form filled');
      
      // Submit registration
      await page2.click('button:has-text("🎯 Create Account")');
      console.log('Player 2 registration submitted');
      
      // Wait for registration to complete and redirect to lobby
      await page2.waitForSelector('text=Welcome, ' + PLAYER2.username + '!', { timeout: 15000 });
      console.log('Player 2 in lobby');

      // Wait a moment to see the lobby
      await page2.waitForTimeout(2000);

      // --- Player 1 Creates Game ---
      console.log('Player 1 creating game...');
      await page1.waitForSelector('input[placeholder="Enter game name"]', { timeout: 5000 });
      await page1.fill('input[placeholder="Enter game name"]', 'Browser Test Game');
      await page1.click('button:has-text("Create Game")');
      
      // Wait for game to be created and Player 1 to enter the game
      await page1.waitForSelector('[data-testid="game-root"]', { timeout: 15000 });
      console.log('Player 1 entered the game');

      // Wait a moment to see the game
      await page1.waitForTimeout(2000);

      // --- Player 2 Joins Game ---
      console.log('Player 2 joining game...');
      await page2.waitForSelector('button:has-text("Join Game")', { timeout: 5000 });
      await page2.click('button:has-text("Join Game")');
      
      // Wait for Player 2 to enter the game
      await page2.waitForSelector('[data-testid="game-root"]', { timeout: 15000 });
      console.log('Player 2 entered the game');

      // Wait a moment for both players to see the game
      await page1.waitForTimeout(3000);
      await page2.waitForTimeout(3000);

      // --- Gameplay: Player 1 goes first ---
      console.log('Starting gameplay...');
      
      // Player 1 makes first move (center cell)
      await page1.waitForSelector('text=Your turn!', { timeout: 15000 });
      console.log('Player 1 sees "Your turn!"');
      await page1.click('.game-cell:nth-child(5)'); // Center cell
      console.log('Player 1 clicked center cell');
      
      // Wait for Player 2 to see their turn
      await page2.waitForSelector('text=Your turn!', { timeout: 15000 });
      console.log('Player 2 sees "Your turn!"');
      
      // Player 2 makes second move (top-left cell)
      await page2.click('.game-cell:first-child'); // Top-left cell
      console.log('Player 2 clicked top-left cell');
      
      // Wait for Player 1 to see their turn again
      await page1.waitForSelector('text=Your turn!', { timeout: 15000 });
      console.log('Player 1 sees "Your turn!" again');
      
      // Player 1 makes third move (top-right cell)
      await page1.click('.game-cell:nth-child(3)'); // Top-right cell
      console.log('Player 1 clicked top-right cell');
      
      // Wait for Player 2 to see their turn
      await page2.waitForSelector('text=Your turn!', { timeout: 15000 });
      console.log('Player 2 sees "Your turn!" again');
      
      // Player 2 makes fourth move (bottom-left cell)
      await page2.click('.game-cell:nth-child(7)'); // Bottom-left cell
      console.log('Player 2 clicked bottom-left cell');
      
      // Wait for Player 1 to see their turn
      await page1.waitForSelector('text=Your turn!', { timeout: 15000 });
      console.log('Player 1 sees "Your turn!" for winning move');
      
      // Player 1 makes winning move (bottom-right cell)
      await page1.click('.game-cell:nth-child(9)'); // Bottom-right cell
      console.log('Player 1 clicked bottom-right cell - should win!');
      
      // Wait for game end messages
      await page1.waitForSelector('text=You win!', { timeout: 15000 });
      await page2.waitForSelector('text=You lose!', { timeout: 15000 });
      console.log('Game ended - Player 1 won, Player 2 lost');

      // Wait a moment to see the game end state
      await page1.waitForTimeout(3000);
      await page2.waitForTimeout(3000);

      // --- Both players return to lobby ---
      console.log('Players returning to lobby...');
      await page1.click('button:has-text("Back to Lobby")');
      await page2.click('button:has-text("Back to Lobby")');
      
      // Wait for both players to be back in lobby
      await page1.waitForSelector('text=Welcome, ' + PLAYER1.username + '!', { timeout: 15000 });
      await page2.waitForSelector('text=Welcome, ' + PLAYER2.username + '!', { timeout: 15000 });
      console.log('Both players back in lobby');

      // Wait a moment to see the lobby with updated stats
      await page1.waitForTimeout(3000);
      await page2.waitForTimeout(3000);

      // --- Check stats in the UI ---
      console.log('Checking player stats in UI...');
      
      // Wait for stats to be visible
      await page1.waitForSelector('text=Wins:', { timeout: 5000 });
      await page2.waitForSelector('text=Losses:', { timeout: 5000 });
      
      // Verify Player 1 has 1 win
      await expect(page1.locator('text=Wins: 1')).toBeVisible({ timeout: 3000 });
      await expect(page1.locator('text=Losses: 0')).toBeVisible({ timeout: 3000 });
      console.log('✅ Player 1 stats: 1 win, 0 losses confirmed');
      
      // Verify Player 2 has 1 loss
      await expect(page2.locator('text=Wins: 0')).toBeVisible({ timeout: 3000 });
      await expect(page2.locator('text=Losses: 1')).toBeVisible({ timeout: 3000 });
      console.log('✅ Player 2 stats: 0 wins, 1 loss confirmed');

      // Wait a moment to see the final stats
      await page1.waitForTimeout(3000);
      await page2.waitForTimeout(3000);

      // --- Both players log out ---
      console.log('Players logging out...');
      await page1.click('button:has-text("Sign Out")');
      await page2.click('button:has-text("Sign Out")');
      
      // Wait for both players to be back at login page
      await page1.waitForSelector('input#username', { timeout: 15000 });
      await page2.waitForSelector('input#username', { timeout: 15000 });
      console.log('Both players logged out successfully');

      // Wait a moment to see the final state
      await page1.waitForTimeout(2000);
      await page2.waitForTimeout(2000);

      console.log('🎉 Browser E2E test completed successfully!');
      console.log('✅ Test PASSED: Full browser UI game flow working!');

    } catch (error) {
      console.error('Test failed:', error);
      
      // Take screenshots on failure
      await page1.screenshot({ path: 'player1-error-state.png' });
      await page2.screenshot({ path: 'player2-error-state.png' });
      console.log('📸 Error screenshots saved');
      
      throw error;
    } finally {
      // Close browser contexts
      await context1.close();
      await context2.close();
    }
  });
}); 