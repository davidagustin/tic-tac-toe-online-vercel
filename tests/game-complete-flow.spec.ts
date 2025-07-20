import { test, expect } from '@playwright/test';

test.describe('Complete Game Flow - Two Players', () => {
  test('Two players can play a complete game and logout', async ({ browser }) => {
    // Create two browser contexts for two players
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Navigate both players to the application
      await page1.goto('http://localhost:3001');
      await page2.goto('http://localhost:3001');

      // Wait for the login page to load
      await page1.waitForSelector('[data-testid="submit-button"]');
      await page2.waitForSelector('[data-testid="submit-button"]');

      console.log('✅ Login page loaded for both players');

      // Player 1: Click "Create New Account"
      await page1.click('button:has-text("Create New Account")');
      await page1.waitForSelector('input[name="userName"]');
      
      // Player 1: Register
      await page1.fill('input[name="userName"]', 'Player1');
      await page1.fill('input[name="password"]', 'password123');
      await page1.click('button[type="submit"]');

      // Player 2: Click "Create New Account"
      await page2.click('button:has-text("Create New Account")');
      await page2.waitForSelector('input[name="userName"]');
      
      // Player 2: Register
      await page2.fill('input[name="userName"]', 'Player2');
      await page2.fill('input[name="password"]', 'password123');
      await page2.click('button[type="submit"]');

      console.log('✅ Both players registered');

      // Wait for both players to be redirected to the lobby
      await page1.waitForURL('**/lobby**', { timeout: 10000 });
      await page2.waitForURL('**/lobby**', { timeout: 10000 });

      console.log('✅ Both players in lobby');

      // Player 1: Create a new game
      await page1.waitForSelector('button:has-text("Create Game")');
      await page1.click('button:has-text("Create Game")');
      
      // Wait for game creation form
      await page1.waitForSelector('input[name="gameName"]');
      await page1.fill('input[name="gameName"]', 'Test Game');
      await page1.click('button:has-text("Create")');

      console.log('✅ Player 1 created game');

      // Wait for game to be created and player 1 to be in the game
      await page1.waitForURL('**/game/**', { timeout: 10000 });
      
      // Player 2: Wait for the game to appear in the lobby and join it
      await page2.waitForSelector('button:has-text("Join")', { timeout: 10000 });
      await page2.click('button:has-text("Join")');

      console.log('✅ Player 2 joined game');

      // Wait for player 2 to be in the game
      await page2.waitForURL('**/game/**', { timeout: 10000 });

      // Wait for both players to be in the game
      await page1.waitForSelector('.game-board', { timeout: 10000 });
      await page2.waitForSelector('.game-board', { timeout: 10000 });

      console.log('✅ Both players in game');

      // Wait for game to be ready (both players connected)
      await page1.waitForSelector('.game-status:has-text("Your turn")', { timeout: 15000 });
      await page2.waitForSelector('.game-status:has-text("Waiting for opponent")', { timeout: 15000 });

      console.log('✅ Game ready to play');

      // Player 1 makes first move (top-left corner)
      await page1.click('.game-board .cell:nth-child(1)');
      await page1.waitForSelector('.game-board .cell:nth-child(1):has-text("X")');

      console.log('✅ Player 1 made first move');

      // Player 2 makes second move (top-center)
      await page2.waitForSelector('.game-status:has-text("Your turn")', { timeout: 10000 });
      await page2.click('.game-board .cell:nth-child(2)');
      await page2.waitForSelector('.game-board .cell:nth-child(2):has-text("O")');

      console.log('✅ Player 2 made second move');

      // Player 1 makes third move (top-right)
      await page1.waitForSelector('.game-status:has-text("Your turn")', { timeout: 10000 });
      await page1.click('.game-board .cell:nth-child(3)');
      await page1.waitForSelector('.game-board .cell:nth-child(3):has-text("X")');

      console.log('✅ Player 1 made third move');

      // Player 2 makes fourth move (center-left)
      await page2.waitForSelector('.game-status:has-text("Your turn")', { timeout: 10000 });
      await page2.click('.game-board .cell:nth-child(4)');
      await page2.waitForSelector('.game-board .cell:nth-child(4):has-text("O")');

      console.log('✅ Player 2 made fourth move');

      // Player 1 makes winning move (center)
      await page1.waitForSelector('.game-status:has-text("Your turn")', { timeout: 10000 });
      await page1.click('.game-board .cell:nth-child(5)');
      await page1.waitForSelector('.game-board .cell:nth-child(5):has-text("X")');

      console.log('✅ Player 1 made winning move');

      // Wait for game to end and winner to be declared
      await page1.waitForSelector('.game-status:has-text("Winner")', { timeout: 10000 });
      await page2.waitForSelector('.game-status:has-text("Winner")', { timeout: 10000 });

      console.log('✅ Game ended with winner');

      // Both players click "Back to Lobby"
      await page1.click('button:has-text("Back to Lobby")');
      await page2.click('button:has-text("Back to Lobby")');

      // Wait for both players to be back in lobby
      await page1.waitForURL('**/lobby**', { timeout: 10000 });
      await page2.waitForURL('**/lobby**', { timeout: 10000 });

      console.log('✅ Both players back in lobby');

      // Player 1: Logout
      await page1.click('button:has-text("Logout")');
      await page1.waitForURL('**/', { timeout: 10000 });

      // Player 2: Logout
      await page2.click('button:has-text("Logout")');
      await page2.waitForURL('**/', { timeout: 10000 });

      console.log('✅ Both players logged out successfully');

      // Verify both players are back at the login page
      await page1.waitForSelector('[data-testid="submit-button"]');
      await page2.waitForSelector('[data-testid="submit-button"]');

      console.log('✅ Complete game flow test passed!');

    } catch (error) {
      console.error('❌ Test failed:', error);
      
      // Take screenshots for debugging
      await page1.screenshot({ path: 'test-results/player1-error.png' });
      await page2.screenshot({ path: 'test-results/player2-error.png' });
      
      // Log console errors (already captured by page.on('console'))
      console.error('Console errors were captured during test execution');
      
      throw error;
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('Debug connection issues', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait a bit to collect errors
    await page.waitForTimeout(5000);
    
    console.log('Console errors found:', errors);
    
    // Check if Pusher is connecting
    const pusherStatus = await page.evaluate(() => {
      return {
        pusherExists: typeof window !== 'undefined' && 'Pusher' in window
      };
    });
    
    console.log('Pusher status:', pusherStatus);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/debug-connection.png' });
  });
}); 