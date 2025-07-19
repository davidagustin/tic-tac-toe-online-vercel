import { test, expect } from '@playwright/test';

test('Simple production test - Single user login and basic functionality', async ({ page }) => {
  console.log('🚀 Starting simple production test...');
  
  try {
    // Navigate to production
    console.log('📱 Navigating to production site...');
    await page.goto('https://tic-tac-toe-online-vercel.vercel.app', { 
      waitUntil: 'networkidle',
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
    
    // Wait for lobby with reasonable timeout
    console.log('⏳ Waiting for lobby to load...');
    await page.waitForSelector('text=Game Lobby', { timeout: 45000 });
    console.log('✅ Successfully logged in and lobby loaded');
    
    // Verify lobby content
    await expect(page.locator('text=Welcome to the ultimate Tic-Tac-Toe experience!')).toBeVisible({ timeout: 10000 });
    console.log('✅ Lobby content verified');
    
    // Check for basic UI elements
    await expect(page.locator('button:has-text("Create Game")')).toBeVisible({ timeout: 5000 });
    console.log('✅ Create Game button visible');
    
    // Try to access stats
    console.log('📊 Checking stats access...');
    await page.click('text=Stats, button:has-text("Stats")');
    await page.waitForSelector('text=Player Statistics, text=Games Played, text=Wins, text=Losses', { timeout: 10000 });
    console.log('✅ Stats page accessible');
    
    // Return to lobby
    await page.click('text=Game Lobby, button:has-text("Lobby")');
    await page.waitForSelector('text=Welcome to the ultimate Tic-Tac-Toe experience!', { timeout: 10000 });
    console.log('✅ Returned to lobby');
    
    // Sign out
    console.log('👋 Signing out...');
    await page.click('button:has-text("Sign Out")');
    await page.waitForSelector('text=Welcome Back', { timeout: 10000 });
    console.log('✅ Successfully signed out');
    
    console.log('🎉 Simple production test PASSED!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'simple-test-error.png', fullPage: true });
    
    // Log current page state
    console.log('Current URL:', await page.url());
    console.log('Page title:', await page.title());
    
    throw error;
  }
});

test('Production connection test - Two users basic interaction', async ({ browser }) => {
  console.log('🔌 Starting two-user connection test...');
  
  // Create contexts with shorter timeouts
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  
  try {
    // User 1: Quick login
    console.log('👤 User 1: Quick login...');
    await page1.goto('https://tic-tac-toe-online-vercel.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    await page1.fill('input[placeholder="Enter your username"]', 'demo');
    await page1.fill('input[placeholder="Enter your password"]', 'demo123');
    await page1.click('button:has-text("Sign In")');
    await page1.waitForSelector('text=Game Lobby', { timeout: 45000 });
    console.log('✅ User 1 logged in');
    
    // User 2: Quick login
    console.log('👤 User 2: Quick login...');
    await page2.goto('https://tic-tac-toe-online-vercel.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    await page2.fill('input[placeholder="Enter your username"]', 'test');
    await page2.fill('input[placeholder="Enter your password"]', 'test123');
    await page2.click('button:has-text("Sign In")');
    await page2.waitForSelector('text=Game Lobby', { timeout: 45000 });
    console.log('✅ User 2 logged in');
    
    // Quick game creation test
    console.log('🎮 Testing quick game creation...');
    await page1.click('button:has-text("Create Game")');
    await page1.waitForSelector('input[placeholder*="game name"], input[placeholder*="Game name"]', { timeout: 10000 });
    await page1.fill('input[placeholder*="game name"], input[placeholder*="Game name"]', 'Quick Test Game');
    await page1.click('button:has-text("Create"), button:has-text("Start Game")');
    await page1.waitForSelector('text=Quick Test Game', { timeout: 15000 });
    console.log('✅ Game created');
    
    // User 2 should see the game
    await page2.waitForSelector('text=Quick Test Game', { timeout: 15000 });
    console.log('✅ User 2 can see the game (real-time working)');
    
    // Quick cleanup
    await page1.click('text=Quick Test Game');
    await page1.click('button:has-text("Leave Game"), button:has-text("Back to Lobby")');
    await page1.waitForSelector('text=Game Lobby', { timeout: 10000 });
    
    // Sign out both users
    await page1.click('button:has-text("Sign Out")');
    await page2.click('button:has-text("Sign Out")');
    
    await page1.waitForSelector('text=Welcome Back', { timeout: 10000 });
    await page2.waitForSelector('text=Welcome Back', { timeout: 10000 });
    
    console.log('🎉 Two-user connection test PASSED!');
    
  } catch (error) {
    console.error('❌ Two-user test failed:', error);
    
    await page1.screenshot({ path: 'user1-error.png', fullPage: true });
    await page2.screenshot({ path: 'user2-error.png', fullPage: true });
    
    throw error;
  } finally {
    await context1.close();
    await context2.close();
  }
}); 