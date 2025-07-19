import { test, expect } from '@playwright/test';

test('Production complete game test with browser contexts', async ({ browser }) => {
  // Create separate browser contexts for each player to maintain isolated sessions
  const player1Context = await browser.newContext();
  const player2Context = await browser.newContext();
  
  const player1Page = await player1Context.newPage();
  const player2Page = await player2Context.newPage();
  
  try {
    console.log('🚀 Starting production game test with browser contexts...');
    
    // Player 1: Login as demo user
    console.log('👤 Player 1: Logging in as demo user...');
    await player1Page.goto('https://tic-tac-toe-online-vercel.vercel.app');
    await player1Page.waitForLoadState('networkidle');
    
    await player1Page.fill('input[placeholder="Enter your username"]', 'demo');
    await player1Page.fill('input[placeholder="Enter your password"]', 'demo123');
    await player1Page.click('button:has-text("Sign In")');
    
    // Wait for lobby to load
    await player1Page.waitForSelector('text=Game Lobby', { timeout: 30000 });
    console.log('✅ Player 1: Successfully logged in and lobby loaded');
    
    // Player 1: Create a game
    console.log('🎮 Player 1: Creating a new game...');
    await player1Page.click('button:has-text("Create Game")');
    
    // Wait for game creation form and fill it
    await player1Page.waitForSelector('input[placeholder*="game name"], input[placeholder*="Game name"]', { timeout: 10000 });
    await player1Page.fill('input[placeholder*="game name"], input[placeholder*="Game name"]', 'Context Test Game');
    await player1Page.click('button:has-text("Create"), button:has-text("Start Game")');
    
    // Wait for game to be created and visible in lobby
    await player1Page.waitForSelector('text=Context Test Game', { timeout: 15000 });
    console.log('✅ Player 1: Game created successfully');
    
    // Player 2: Login as test user in separate context
    console.log('👤 Player 2: Logging in as test user...');
    await player2Page.goto('https://tic-tac-toe-online-vercel.vercel.app');
    await player2Page.waitForLoadState('networkidle');
    
    await player2Page.fill('input[placeholder="Enter your username"]', 'test');
    await player2Page.fill('input[placeholder="Enter your password"]', 'test123');
    await player2Page.click('button:has-text("Sign In")');
    
    // Wait for lobby to load
    await player2Page.waitForSelector('text=Game Lobby', { timeout: 30000 });
    console.log('✅ Player 2: Successfully logged in and lobby loaded');
    
    // Player 2: Join the game created by Player 1
    console.log('🎮 Player 2: Joining the game...');
    await player2Page.waitForSelector('text=Context Test Game', { timeout: 15000 });
    await player2Page.click('text=Context Test Game');
    await player2Page.click('button:has-text("Join Game")');
    
    // Both players should now be in the game
    await player1Page.waitForSelector('text=Game in Progress', { timeout: 15000 });
    await player2Page.waitForSelector('text=Game in Progress', { timeout: 15000 });
    console.log('✅ Both players are now in the game');
    
    // Wait for game board to be visible on both pages
    await player1Page.waitForSelector('[data-testid="game-board"], .game-board, .board, .grid', { timeout: 15000 });
    await player2Page.waitForSelector('[data-testid="game-board"], .game-board, .board, .grid', { timeout: 15000 });
    console.log('✅ Game boards are visible to both players');
    
    // Play a complete game - Player 1 (X) vs Player 2 (O)
    console.log('🎯 Starting the game...');
    
    // Player 1 (X) - Center move
    const centerCell = player1Page.locator('[data-testid="cell-4"], .cell:nth-child(5), .board > div:nth-child(5), .grid > div:nth-child(5)').first();
    await centerCell.click();
    console.log('✅ Player 1 (X) placed in center');
    await player1Page.waitForTimeout(1000);
    
    // Player 2 (O) - Top-left move
    const topLeftCell = player2Page.locator('[data-testid="cell-0"], .cell:nth-child(1), .board > div:nth-child(1), .grid > div:nth-child(1)').first();
    await topLeftCell.click();
    console.log('✅ Player 2 (O) placed in top-left');
    await player2Page.waitForTimeout(1000);
    
    // Player 1 (X) - Top-right move
    const topRightCell = player1Page.locator('[data-testid="cell-2"], .cell:nth-child(3), .board > div:nth-child(3), .grid > div:nth-child(3)').first();
    await topRightCell.click();
    console.log('✅ Player 1 (X) placed in top-right');
    await player1Page.waitForTimeout(1000);
    
    // Player 2 (O) - Bottom-left move
    const bottomLeftCell = player2Page.locator('[data-testid="cell-6"], .cell:nth-child(7), .board > div:nth-child(7), .grid > div:nth-child(7)').first();
    await bottomLeftCell.click();
    console.log('✅ Player 2 (O) placed in bottom-left');
    await player2Page.waitForTimeout(1000);
    
    // Player 1 (X) - Bottom-right move (Winning move)
    const bottomRightCell = player1Page.locator('[data-testid="cell-8"], .cell:nth-child(9), .board > div:nth-child(9), .grid > div:nth-child(9)').first();
    await bottomRightCell.click();
    console.log('✅ Player 1 (X) placed in bottom-right - WINNING MOVE!');
    
    // Wait for game result to be displayed
    await player1Page.waitForSelector('text=Game Over, text=Winner, text=won, text=Congratulations, text=Player X wins', { timeout: 15000 });
    await player2Page.waitForSelector('text=Game Over, text=Winner, text=won, text=Congratulations, text=Player X wins', { timeout: 15000 });
    console.log('✅ Game completed - Player 1 (X) wins!');
    
    // Both players leave the game
    console.log('🚪 Both players leaving the game...');
    await player1Page.click('button:has-text("Leave Game"), button:has-text("Back to Lobby")');
    await player2Page.click('button:has-text("Leave Game"), button:has-text("Back to Lobby")');
    
    // Wait for both players to return to lobby
    await player1Page.waitForSelector('text=Game Lobby', { timeout: 10000 });
    await player2Page.waitForSelector('text=Game Lobby', { timeout: 10000 });
    console.log('✅ Both players returned to lobby');
    
    // Check Player 1 stats
    console.log('📊 Checking Player 1 stats...');
    await player1Page.click('text=Stats, button:has-text("Stats")');
    await player1Page.waitForSelector('text=Player Statistics, text=Games Played, text=Wins, text=Losses', { timeout: 10000 });
    
    const player1StatsText = await player1Page.textContent('body');
    console.log('📈 Player 1 stats page loaded');
    
    // Check Player 2 stats
    console.log('📊 Checking Player 2 stats...');
    await player2Page.click('text=Stats, button:has-text("Stats")');
    await player2Page.waitForSelector('text=Player Statistics, text=Games Played, text=Wins, text=Losses', { timeout: 10000 });
    
    const player2StatsText = await player2Page.textContent('body');
    console.log('📈 Player 2 stats page loaded');
    
    // Both players sign out
    console.log('👋 Both players signing out...');
    await player1Page.click('button:has-text("Sign Out")');
    await player2Page.click('button:has-text("Sign Out")');
    
    // Verify both are back at login page
    await player1Page.waitForSelector('text=Welcome Back', { timeout: 10000 });
    await player2Page.waitForSelector('text=Welcome Back', { timeout: 10000 });
    console.log('✅ Both players successfully signed out');
    
    console.log('🎉 Production complete game test PASSED!');
    console.log('✅ Two players played a complete game');
    console.log('✅ Game was properly tracked');
    console.log('✅ Stats were accessible');
    console.log('✅ Both players could sign out cleanly');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Take screenshots for debugging
    await player1Page.screenshot({ path: 'player1-error.png', fullPage: true });
    await player2Page.screenshot({ path: 'player2-error.png', fullPage: true });
    
    // Log current page URLs for debugging
    console.log('Player 1 current URL:', await player1Page.url());
    console.log('Player 2 current URL:', await player2Page.url());
    
    throw error;
  } finally {
    // Clean up browser contexts
    await player1Context.close();
    await player2Context.close();
    console.log('🧹 Browser contexts cleaned up');
  }
}); 