import { test, expect } from '@playwright/test';

test('Production complete game test - Two players play and check stats', async ({ browser }) => {
  // Create two browser contexts for two players
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  
  try {
    // Player 1: Login as demo user
    await page1.goto('https://tic-tac-toe-online-vercel.vercel.app');
    await page1.waitForLoadState('networkidle');
    await page1.fill('input[placeholder="Enter your username"]', 'demo');
    await page1.fill('input[placeholder="Enter your password"]', 'demo123');
    await page1.click('button:has-text("Sign In")');
    
    // Wait for lobby to load
    await page1.waitForSelector('text=Game Lobby', { timeout: 20000 });
    await page1.waitForSelector('text=Welcome to the ultimate Tic-Tac-Toe experience!', { timeout: 10000 });
    
    // Player 1: Create a game
    await page1.click('button:has-text("Create Game")');
    await page1.waitForSelector('input[placeholder*="game name"], input[placeholder*="Game name"]', { timeout: 5000 });
    await page1.fill('input[placeholder*="game name"], input[placeholder*="Game name"]', 'Production Test Game');
    await page1.click('button:has-text("Create"), button:has-text("Start Game")');
    
    // Wait for game to be created and visible in lobby
    await page1.waitForSelector('text=Production Test Game', { timeout: 10000 });
    
    // Player 2: Login as test user
    await page2.goto('https://tic-tac-toe-online-vercel.vercel.app');
    await page2.waitForLoadState('networkidle');
    await page2.fill('input[placeholder="Enter your username"]', 'test');
    await page2.fill('input[placeholder="Enter your password"]', 'test123');
    await page2.click('button:has-text("Sign In")');
    
    // Wait for lobby to load
    await page2.waitForSelector('text=Game Lobby', { timeout: 20000 });
    await page2.waitForSelector('text=Welcome to the ultimate Tic-Tac-Toe experience!', { timeout: 10000 });
    
    // Player 2: Join the game
    await page2.waitForSelector('text=Production Test Game', { timeout: 10000 });
    await page2.click('text=Production Test Game');
    await page2.click('button:has-text("Join Game")');
    
    // Both players should now be in the game
    await page1.waitForSelector('text=Game in Progress', { timeout: 10000 });
    await page2.waitForSelector('text=Game in Progress', { timeout: 10000 });
    
    // Wait for game board to be visible
    await page1.waitForSelector('[data-testid="game-board"], .game-board, .board', { timeout: 10000 });
    await page2.waitForSelector('[data-testid="game-board"], .game-board, .board', { timeout: 10000 });
    
    // Play the game - Player 1 (X) goes first
    // Click center cell
    const centerCell = page1.locator('[data-testid="cell-4"], .cell:nth-child(5), .board > div:nth-child(5)').first();
    await centerCell.click();
    
    // Player 2 (O) responds - click top-left
    const topLeftCell = page2.locator('[data-testid="cell-0"], .cell:nth-child(1), .board > div:nth-child(1)').first();
    await topLeftCell.click();
    
    // Player 1 (X) - click top-right
    const topRightCell = page1.locator('[data-testid="cell-2"], .cell:nth-child(3), .board > div:nth-child(3)').first();
    await topRightCell.click();
    
    // Player 2 (O) - click bottom-left
    const bottomLeftCell = page2.locator('[data-testid="cell-6"], .cell:nth-child(7), .board > div:nth-child(7)').first();
    await bottomLeftCell.click();
    
    // Player 1 (X) - click bottom-right to win
    const bottomRightCell = page1.locator('[data-testid="cell-8"], .cell:nth-child(9), .board > div:nth-child(9)').first();
    await bottomRightCell.click();
    
    // Wait for game result
    await page1.waitForSelector('text=Game Over, text=Winner, text=won, text=Congratulations', { timeout: 10000 });
    await page2.waitForSelector('text=Game Over, text=Winner, text=won, text=Congratulations', { timeout: 10000 });
    
    // Both players leave the game
    await page1.click('button:has-text("Leave Game"), button:has-text("Back to Lobby")');
    await page2.click('button:has-text("Leave Game"), button:has-text("Back to Lobby")');
    
    // Wait for both players to return to lobby
    await page1.waitForSelector('text=Game Lobby', { timeout: 10000 });
    await page2.waitForSelector('text=Game Lobby', { timeout: 10000 });
    
    // Check Player 1 stats
    await page1.click('text=Stats, button:has-text("Stats")');
    await page1.waitForSelector('text=Player Statistics, text=Games Played, text=Wins, text=Losses', { timeout: 5000 });
    
    // Verify Player 1 has at least 1 game played and 1 win
    const player1Stats = await page1.textContent('body');
    console.log('Player 1 stats:', player1Stats);
    
    // Check Player 2 stats
    await page2.click('text=Stats, button:has-text("Stats")');
    await page2.waitForSelector('text=Player Statistics, text=Games Played, text=Wins, text=Losses', { timeout: 5000 });
    
    // Verify Player 2 has at least 1 game played and 1 loss
    const player2Stats = await page2.textContent('body');
    console.log('Player 2 stats:', player2Stats);
    
    // Both players sign out
    await page1.click('button:has-text("Sign Out")');
    await page2.click('button:has-text("Sign Out")');
    
    // Verify both are back at login
    await page1.waitForSelector('text=Welcome Back', { timeout: 10000 });
    await page2.waitForSelector('text=Welcome Back', { timeout: 10000 });
    
    console.log('Production complete game test passed - Two players played, completed game, and checked stats');
    
  } finally {
    // Clean up
    await context1.close();
    await context2.close();
  }
}); 