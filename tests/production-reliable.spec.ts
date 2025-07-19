import { test, expect } from '@playwright/test';

test.describe('Reliable Production Tests', () => {
  test('Basic site accessibility', async ({ page }) => {
    console.log('🔍 Testing basic site accessibility...');
    
    await page.goto('https://tic-tac-toe-online-vercel.vercel.app', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    await expect(page.locator('text=Welcome Back')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[placeholder="Enter your username"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[placeholder="Enter your password"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Basic site accessibility test passed');
  });

  test('Single user login and logout', async ({ page }) => {
    console.log('👤 Testing single user login...');
    
    await page.goto('https://tic-tac-toe-online-vercel.vercel.app', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Login
    await page.fill('input[placeholder="Enter your username"]', 'demo');
    await page.fill('input[placeholder="Enter your password"]', 'demo123');
    await page.click('button:has-text("Sign In")');
    
    // Wait for lobby with reasonable timeout
    await page.waitForSelector('text=Game Lobby', { timeout: 45000 });
    console.log('✅ Login successful');
    
    // Verify lobby content
    await expect(page.locator('text=Welcome to the ultimate Tic-Tac-Toe experience!')).toBeVisible({ timeout: 10000 });
    
    // Sign out
    await page.click('button:has-text("Sign Out")');
    await page.waitForSelector('text=Welcome Back', { timeout: 15000 });
    
    console.log('✅ Single user login/logout test passed');
  });

  test('Two users basic interaction', async ({ browser }) => {
    console.log('👥 Testing two users basic interaction...');
    
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      // User 1 login
      await page1.goto('https://tic-tac-toe-online-vercel.vercel.app', { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      });
      await page1.fill('input[placeholder="Enter your username"]', 'demo');
      await page1.fill('input[placeholder="Enter your password"]', 'demo123');
      await page1.click('button:has-text("Sign In")');
      await page1.waitForSelector('text=Game Lobby', { timeout: 45000 });
      
      // User 2 login
      await page2.goto('https://tic-tac-toe-online-vercel.vercel.app', { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      });
      await page2.fill('input[placeholder="Enter your username"]', 'test');
      await page2.fill('input[placeholder="Enter your password"]', 'test123');
      await page2.click('button:has-text("Sign In")');
      await page2.waitForSelector('text=Game Lobby', { timeout: 45000 });
      
      console.log('✅ Both users logged in');
      
      // User 1 creates a game
      await page1.click('button:has-text("Create Game")');
      await page1.waitForSelector('input[placeholder*="game name"], input[placeholder*="Game name"]', { timeout: 10000 });
      await page1.fill('input[placeholder*="game name"], input[placeholder*="Game name"]', 'Reliable Test Game');
      await page1.click('button:has-text("Create"), button:has-text("Start Game")');
      await page1.waitForSelector('text=Reliable Test Game', { timeout: 15000 });
      
      // User 2 should see the game
      await page2.waitForSelector('text=Reliable Test Game', { timeout: 15000 });
      console.log('✅ Real-time game creation working');
      
      // Cleanup
      await page1.click('text=Reliable Test Game');
      await page1.click('button:has-text("Leave Game"), button:has-text("Back to Lobby")');
      await page1.waitForSelector('text=Game Lobby', { timeout: 10000 });
      
      // Sign out both users
      await page1.click('button:has-text("Sign Out")');
      await page2.click('button:has-text("Sign Out")');
      
      await page1.waitForSelector('text=Welcome Back', { timeout: 10000 });
      await page2.waitForSelector('text=Welcome Back', { timeout: 10000 });
      
      console.log('✅ Two users interaction test passed');
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });
}); 