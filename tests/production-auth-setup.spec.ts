import { test as base, expect, BrowserContext } from '@playwright/test';
import path from 'path';

// Define the custom fixtures
type CustomFixtures = {
  authenticatedContext: BrowserContext;
  player1Context: BrowserContext;
  player2Context: BrowserContext;
};

// Extend the test to include authentication state management
const test = base.extend<CustomFixtures>({
  // Create a context that can be reused with saved auth state
  authenticatedContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    await use(context);
    await context.close();
  },
  
  // Player 1 context with demo user auth
  player1Context: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Login as demo user
    await page.goto('https://tic-tac-toe-online-vercel.vercel.app');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder="Enter your username"]', 'demo');
    await page.fill('input[placeholder="Enter your password"]', 'demo123');
    await page.click('button:has-text("Sign In")');
    
    // Wait for successful login
    await page.waitForSelector('text=Game Lobby', { timeout: 30000 });
    
    // Save authentication state
    await context.storageState({ path: path.join(__dirname, 'player1-auth.json') });
    
    await use(context);
    await context.close();
  },
  
  // Player 2 context with test user auth
  player2Context: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Login as test user
    await page.goto('https://tic-tac-toe-online-vercel.vercel.app');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder="Enter your username"]', 'test');
    await page.fill('input[placeholder="Enter your password"]', 'test123');
    await page.click('button:has-text("Sign In")');
    
    // Wait for successful login
    await page.waitForSelector('text=Game Lobby', { timeout: 30000 });
    
    // Save authentication state
    await context.storageState({ path: path.join(__dirname, 'player2-auth.json') });
    
    await use(context);
    await context.close();
  },
});

export { test, expect };

// Test that uses saved authentication states
test('Production game with saved auth states', async ({ browser }) => {
  // Create contexts using saved authentication states
  const player1Context = await browser.newContext({
    storageState: path.join(__dirname, 'player1-auth.json')
  });
  
  const player2Context = await browser.newContext({
    storageState: path.join(__dirname, 'player2-auth.json')
  });
  
  const player1Page = await player1Context.newPage();
  const player2Page = await player2Context.newPage();
  
  try {
    console.log('🚀 Starting production game test with saved auth states...');
    
    // Both players should already be logged in, go directly to lobby
    await player1Page.goto('https://tic-tac-toe-online-vercel.vercel.app');
    await player2Page.goto('https://tic-tac-toe-online-vercel.vercel.app');
    
    // Verify both are in lobby
    await player1Page.waitForSelector('text=Game Lobby', { timeout: 10000 });
    await player2Page.waitForSelector('text=Game Lobby', { timeout: 10000 });
    console.log('✅ Both players are logged in and in lobby');
    
    // Player 1 creates a game
    await player1Page.click('button:has-text("Create Game")');
    await player1Page.waitForSelector('input[placeholder*="game name"], input[placeholder*="Game name"]', { timeout: 10000 });
    await player1Page.fill('input[placeholder*="game name"], input[placeholder*="Game name"]', 'Auth State Test Game');
    await player1Page.click('button:has-text("Create"), button:has-text("Start Game")');
    
    // Wait for game to be created
    await player1Page.waitForSelector('text=Auth State Test Game', { timeout: 15000 });
    console.log('✅ Game created by Player 1');
    
    // Player 2 joins the game
    await player2Page.waitForSelector('text=Auth State Test Game', { timeout: 15000 });
    await player2Page.click('text=Auth State Test Game');
    await player2Page.click('button:has-text("Join Game")');
    
    // Both players should be in the game
    await player1Page.waitForSelector('text=Game in Progress', { timeout: 15000 });
    await player2Page.waitForSelector('text=Game in Progress', { timeout: 15000 });
    console.log('✅ Both players are in the game');
    
    // Play a quick game
    const centerCell = player1Page.locator('[data-testid="cell-4"], .cell:nth-child(5), .board > div:nth-child(5), .grid > div:nth-child(5)').first();
    await centerCell.click();
    
    const topLeftCell = player2Page.locator('[data-testid="cell-0"], .cell:nth-child(1), .board > div:nth-child(1), .grid > div:nth-child(1)').first();
    await topLeftCell.click();
    
    const topRightCell = player1Page.locator('[data-testid="cell-2"], .cell:nth-child(3), .board > div:nth-child(3), .grid > div:nth-child(3)').first();
    await topRightCell.click();
    
    const bottomLeftCell = player2Page.locator('[data-testid="cell-6"], .cell:nth-child(7), .board > div:nth-child(7), .grid > div:nth-child(7)').first();
    await bottomLeftCell.click();
    
    const bottomRightCell = player1Page.locator('[data-testid="cell-8"], .cell:nth-child(9), .board > div:nth-child(9), .grid > div:nth-child(9)').first();
    await bottomRightCell.click();
    
    // Wait for game completion
    await player1Page.waitForSelector('text=Game Over, text=Winner, text=won, text=Congratulations', { timeout: 15000 });
    await player2Page.waitForSelector('text=Game Over, text=Winner, text=won, text=Congratulations', { timeout: 15000 });
    console.log('✅ Game completed successfully');
    
    // Both players leave and check stats
    await player1Page.click('button:has-text("Leave Game"), button:has-text("Back to Lobby")');
    await player2Page.click('button:has-text("Leave Game"), button:has-text("Back to Lobby")');
    
    await player1Page.waitForSelector('text=Game Lobby', { timeout: 10000 });
    await player2Page.waitForSelector('text=Game Lobby', { timeout: 10000 });
    
    // Check stats
    await player1Page.click('text=Stats, button:has-text("Stats")');
    await player1Page.waitForSelector('text=Player Statistics, text=Games Played, text=Wins, text=Losses', { timeout: 10000 });
    
    await player2Page.click('text=Stats, button:has-text("Stats")');
    await player2Page.waitForSelector('text=Player Statistics, text=Games Played, text=Wins, text=Losses', { timeout: 10000 });
    
    console.log('✅ Stats checked successfully');
    
    // Sign out
    await player1Page.click('button:has-text("Sign Out")');
    await player2Page.click('button:has-text("Sign Out")');
    
    await player1Page.waitForSelector('text=Welcome Back', { timeout: 10000 });
    await player2Page.waitForSelector('text=Welcome Back', { timeout: 10000 });
    
    console.log('🎉 Production game test with saved auth states PASSED!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await player1Page.screenshot({ path: 'player1-auth-error.png', fullPage: true });
    await player2Page.screenshot({ path: 'player2-auth-error.png', fullPage: true });
    throw error;
  } finally {
    await player1Context.close();
    await player2Context.close();
  }
}); 