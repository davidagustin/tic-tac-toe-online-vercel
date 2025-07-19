import { test, expect } from '@playwright/test';

test('Production simple game test', async ({ browser }) => {
  // Create two browser contexts for two players
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  
  try {
    console.log('Starting production game test...');
    
    // Player 1: Login as demo user
    await page1.goto('https://tic-tac-toe-online-vercel.vercel.app');
    await page1.waitForLoadState('networkidle');
    console.log('Player 1: Page loaded');
    
    await page1.fill('input[placeholder="Enter your username"]', 'demo');
    await page1.fill('input[placeholder="Enter your password"]', 'demo123');
    await page1.click('button:has-text("Sign In")');
    console.log('Player 1: Signed in');
    
    // Wait for lobby to load with longer timeout
    await page1.waitForSelector('text=Game Lobby', { timeout: 30000 });
    console.log('Player 1: Lobby loaded');
    
    // Player 1: Create a game
    await page1.click('button:has-text("Create Game")');
    console.log('Player 1: Clicked create game');
    
    // Wait for game creation form
    await page1.waitForSelector('input[placeholder*="game name"], input[placeholder*="Game name"]', { timeout: 10000 });
    await page1.fill('input[placeholder*="game name"], input[placeholder*="Game name"]', 'Simple Test Game');
    await page1.click('button:has-text("Create"), button:has-text("Start Game")');
    console.log('Player 1: Game created');
    
    // Wait for game to be visible in lobby
    await page1.waitForSelector('text=Simple Test Game', { timeout: 15000 });
    console.log('Player 1: Game visible in lobby');
    
    // Player 2: Login as test user
    await page2.goto('https://tic-tac-toe-online-vercel.vercel.app');
    await page2.waitForLoadState('networkidle');
    console.log('Player 2: Page loaded');
    
    await page2.fill('input[placeholder="Enter your username"]', 'test');
    await page2.fill('input[placeholder="Enter your password"]', 'test123');
    await page2.click('button:has-text("Sign In")');
    console.log('Player 2: Signed in');
    
    // Wait for lobby to load
    await page2.waitForSelector('text=Game Lobby', { timeout: 30000 });
    console.log('Player 2: Lobby loaded');
    
    // Player 2: Join the game
    await page2.waitForSelector('text=Simple Test Game', { timeout: 15000 });
    await page2.click('text=Simple Test Game');
    await page2.click('button:has-text("Join Game")');
    console.log('Player 2: Joined game');
    
    // Both players should now be in the game
    await page1.waitForSelector('text=Game in Progress', { timeout: 15000 });
    await page2.waitForSelector('text=Game in Progress', { timeout: 15000 });
    console.log('Both players in game');
    
    // Wait for game board to be visible
    await page1.waitForSelector('[data-testid="game-board"], .game-board, .board, .grid', { timeout: 15000 });
    await page2.waitForSelector('[data-testid="game-board"], .game-board, .board, .grid', { timeout: 15000 });
    console.log('Game boards visible');
    
    // Make a simple move - Player 1 clicks center
    const centerCell = page1.locator('[data-testid="cell-4"], .cell:nth-child(5), .board > div:nth-child(5), .grid > div:nth-child(5)').first();
    await centerCell.click();
    console.log('Player 1 made a move');
    
    // Wait a moment for the move to register
    await page1.waitForTimeout(2000);
    
    // Both players leave the game
    await page1.click('button:has-text("Leave Game"), button:has-text("Back to Lobby")');
    await page2.click('button:has-text("Leave Game"), button:has-text("Back to Lobby")');
    console.log('Both players left game');
    
    // Wait for both players to return to lobby
    await page1.waitForSelector('text=Game Lobby', { timeout: 10000 });
    await page2.waitForSelector('text=Game Lobby', { timeout: 10000 });
    console.log('Both players back in lobby');
    
    // Both players sign out
    await page1.click('button:has-text("Sign Out")');
    await page2.click('button:has-text("Sign Out")');
    
    // Verify both are back at login
    await page1.waitForSelector('text=Welcome Back', { timeout: 10000 });
    await page2.waitForSelector('text=Welcome Back', { timeout: 10000 });
    
    console.log('Production simple game test passed!');
    
  } catch (error) {
    console.error('Test failed:', error);
    // Take screenshots for debugging
    await page1.screenshot({ path: 'player1-error.png' });
    await page2.screenshot({ path: 'player2-error.png' });
    throw error;
  } finally {
    // Clean up
    await context1.close();
    await context2.close();
  }
}); 