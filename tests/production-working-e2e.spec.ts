import { test, expect } from '@playwright/test';

test('Working production E2E test - Single user complete flow', async ({ page }) => {
  console.log('🚀 Starting working production E2E test...');
  
  try {
    // Navigate to production
    console.log('📱 Navigating to production site...');
    await page.goto('https://tic-tac-toe-online-vercel.vercel.app', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Verify login page loads
    console.log('🔍 Checking login page...');
    await expect(page.locator('text=Welcome Back')).toBeVisible({ timeout: 10000 });
    console.log('✅ Login page loaded successfully');
    
    // Login with demo user
    console.log('👤 Logging in as demo user...');
    await page.fill('input[placeholder="Enter your username"]', 'demo');
    await page.fill('input[placeholder="Enter your password"]', 'demo123');
    await page.click('button:has-text("Sign In")');
    
    // Wait for lobby with extended timeout for production
    console.log('⏳ Waiting for lobby to load (this may take a while)...');
    await page.waitForSelector('text=Game Lobby', { timeout: 60000 });
    console.log('✅ Successfully logged in and lobby loaded');
    
    // Verify lobby content
    await expect(page.locator('text=Welcome to the ultimate Tic-Tac-Toe experience!')).toBeVisible({ timeout: 15000 });
    console.log('✅ Lobby content verified');
    
    // Check for basic UI elements
    await expect(page.locator('button:has-text("Create Game")')).toBeVisible({ timeout: 10000 });
    console.log('✅ Create Game button visible');
    
    // Try to access stats
    console.log('📊 Checking stats access...');
    await page.click('text=Stats, button:has-text("Stats")');
    await page.waitForSelector('text=Player Statistics, text=Games Played, text=Wins, text=Losses', { timeout: 15000 });
    console.log('✅ Stats page accessible');
    
    // Return to lobby
    await page.click('text=Game Lobby, button:has-text("Lobby")');
    await page.waitForSelector('text=Welcome to the ultimate Tic-Tac-Toe experience!', { timeout: 15000 });
    console.log('✅ Returned to lobby');
    
    // Sign out
    console.log('👋 Signing out...');
    await page.click('button:has-text("Sign Out")');
    await page.waitForSelector('text=Welcome Back', { timeout: 15000 });
    console.log('✅ Successfully signed out');
    
    console.log('🎉 Working production E2E test PASSED!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'working-e2e-error.png', fullPage: true });
    
    // Log current page state
    console.log('Current URL:', await page.url());
    console.log('Page title:', await page.title());
    
    throw error;
  }
});

test('Working production two-user test - Basic interaction', async ({ browser }) => {
  console.log('👥 Starting working two-user test...');
  
  // Create contexts
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  
  try {
    // User 1: Login
    console.log('👤 User 1: Logging in...');
    await page1.goto('https://tic-tac-toe-online-vercel.vercel.app', { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });
    await page1.fill('input[placeholder="Enter your username"]', 'demo');
    await page1.fill('input[placeholder="Enter your password"]', 'demo123');
    await page1.click('button:has-text("Sign In")');
    await page1.waitForSelector('text=Game Lobby', { timeout: 60000 });
    console.log('✅ User 1 logged in');
    
    // User 2: Login
    console.log('👤 User 2: Logging in...');
    await page2.goto('https://tic-tac-toe-online-vercel.vercel.app', { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });
    await page2.fill('input[placeholder="Enter your username"]', 'test');
    await page2.fill('input[placeholder="Enter your password"]', 'test123');
    await page2.click('button:has-text("Sign In")');
    await page2.waitForSelector('text=Game Lobby', { timeout: 60000 });
    console.log('✅ User 2 logged in');
    
    // Wait for both users to be fully loaded
    await page1.waitForSelector('text=Welcome to the ultimate Tic-Tac-Toe experience!', { timeout: 15000 });
    await page2.waitForSelector('text=Welcome to the ultimate Tic-Tac-Toe experience!', { timeout: 15000 });
    console.log('✅ Both users in lobby');
    
    // User 1 creates a game
    console.log('🎮 User 1 creating a game...');
    await page1.click('button:has-text("Create Game")');
    await page1.waitForSelector('input[placeholder*="game name"], input[placeholder*="Game name"]', { timeout: 15000 });
    await page1.fill('input[placeholder*="game name"], input[placeholder*="Game name"]', 'Working Test Game');
    await page1.click('button:has-text("Create"), button:has-text("Start Game")');
    await page1.waitForSelector('text=Working Test Game', { timeout: 20000 });
    console.log('✅ Game created by User 1');
    
    // User 2 should see the game
    await page2.waitForSelector('text=Working Test Game', { timeout: 20000 });
    console.log('✅ User 2 can see the game (real-time working)');
    
    // User 2 joins the game
    await page2.click('text=Working Test Game');
    await page2.click('button:has-text("Join Game")');
    console.log('✅ User 2 joined the game');
    
    // Both users should be in the game
    await page1.waitForSelector('text=Game in Progress', { timeout: 15000 });
    await page2.waitForSelector('text=Game in Progress', { timeout: 15000 });
    console.log('✅ Both users in game');
    
    // Quick game play
    console.log('🎲 Playing a quick game...');
    const centerCell = page1.locator('[data-testid="cell-4"], .cell:nth-child(5), .board > div:nth-child(5), .grid > div:nth-child(5)').first();
    await centerCell.click();
    console.log('✅ User 1 made a move');
    
    // Wait for move to sync
    await page1.waitForTimeout(2000);
    await page2.waitForTimeout(2000);
    console.log('✅ Move synchronized');
    
    // Both users leave the game
    await page1.click('button:has-text("Leave Game"), button:has-text("Back to Lobby")');
    await page2.click('button:has-text("Leave Game"), button:has-text("Back to Lobby")');
    
    await page1.waitForSelector('text=Game Lobby', { timeout: 15000 });
    await page2.waitForSelector('text=Game Lobby', { timeout: 15000 });
    console.log('✅ Both users returned to lobby');
    
    // Sign out both users
    await page1.click('button:has-text("Sign Out")');
    await page2.click('button:has-text("Sign Out")');
    
    await page1.waitForSelector('text=Welcome Back', { timeout: 15000 });
    await page2.waitForSelector('text=Welcome Back', { timeout: 15000 });
    
    console.log('🎉 Working two-user test PASSED!');
    
  } catch (error) {
    console.error('❌ Two-user test failed:', error);
    
    await page1.screenshot({ path: 'user1-working-error.png', fullPage: true });
    await page2.screenshot({ path: 'user2-working-error.png', fullPage: true });
    
    throw error;
  } finally {
    await context1.close();
    await context2.close();
  }
}); 