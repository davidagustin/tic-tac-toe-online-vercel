import { test, expect } from '@playwright/test';

test.describe('Production Connection Status Verification', () => {
  test('Verify user has proper connection status and server connectivity', async ({ page }) => {
    console.log('🔌 Testing connection status and server connectivity...');
    
    try {
      // Navigate to production
      await page.goto('https://tic-tac-toe-online-vercel.vercel.app', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      // Login
      await page.fill('input[placeholder="Enter your username"]', 'demo');
      await page.fill('input[placeholder="Enter your password"]', 'demo123');
      await page.click('button:has-text("Sign In")');
      
      // Wait for lobby to load
      await page.waitForSelector('text=Game Lobby', { timeout: 60000 });
      console.log('✅ Login successful');
      
      // Wait for page to fully load and settle
      await page.waitForTimeout(3000);
      
      // Check for proper connection status (should NOT show "Using Fallback")
      console.log('🔍 Checking connection status...');
      
      // Look for the connection status element and verify it's NOT showing "Using Fallback"
      const fallbackStatus = page.locator('text=Using Fallback');
      const fallbackVisible = await fallbackStatus.isVisible({ timeout: 5000 });
      
      if (fallbackVisible) {
        throw new Error('❌ Connection status shows "Using Fallback" - not properly connected');
      }
      console.log('✅ Connection status is not showing "Using Fallback"');
      
      // Check for server connectivity (should NOT show "Not connected to server")
      console.log('🔍 Checking server connectivity...');
      
      const notConnectedWarning = page.locator('text=Not connected to server');
      const notConnectedVisible = await notConnectedWarning.isVisible({ timeout: 5000 });
      
      if (notConnectedVisible) {
        throw new Error('❌ Server connectivity warning shows "Not connected to server"');
      }
      console.log('✅ No server connectivity warnings found');
      
      // Look for positive connection indicators
      console.log('🔍 Looking for positive connection indicators...');
      
      // Check for any connection status that indicates proper connection
      const connectionSelectors = [
        'text=Connected',
        'text=Online',
        'text=🟢',
        'text=●',
        '[data-testid="connection-status"]',
        '.connection-status',
        '.status-indicator'
      ];
      
      let foundPositiveIndicator = false;
      for (const selector of connectionSelectors) {
        try {
          const element = page.locator(selector);
          if (await element.isVisible({ timeout: 2000 })) {
            console.log(`✅ Found positive connection indicator: ${selector}`);
            foundPositiveIndicator = true;
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!foundPositiveIndicator) {
        console.log('⚠️ No specific positive connection indicator found, but no negative indicators either');
      }
      
      // Test real-time functionality by creating a game
      console.log('🎮 Testing real-time functionality...');
      
      await page.click('button:has-text("Create Game")');
      await page.waitForSelector('input[placeholder*="game name"], input[placeholder*="Game name"]', { timeout: 10000 });
      await page.fill('input[placeholder*="game name"], input[placeholder*="Game name"]', 'Connection Test Game');
      await page.click('button:has-text("Create"), button:has-text("Start Game")');
      await page.waitForSelector('text=Connection Test Game', { timeout: 15000 });
      console.log('✅ Game creation successful (real-time working)');
      
      // Clean up
      await page.click('text=Connection Test Game');
      await page.click('button:has-text("Leave Game"), button:has-text("Back to Lobby")');
      await page.waitForSelector('text=Game Lobby', { timeout: 10000 });
      
      // Sign out
      await page.click('button:has-text("Sign Out")');
      await page.waitForSelector('text=Welcome Back', { timeout: 15000 });
      
      console.log('🎉 Connection status verification test PASSED!');
      console.log('✅ User has proper connection status');
      console.log('✅ User is connected to server');
      console.log('✅ Real-time functionality working');
      
    } catch (error) {
      console.error('❌ Connection status test failed:', error);
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'connection-status-error.png', fullPage: true });
      
      // Log current page state
      console.log('Current URL:', await page.url());
      console.log('Page title:', await page.title());
      
      throw error;
    }
  });

  test('Verify two users can connect and see each other', async ({ browser }) => {
    console.log('👥 Testing two users connection and visibility...');
    
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
      await page1.waitForSelector('text=Game Lobby', { timeout: 60000 });
      
      // User 2 login
      await page2.goto('https://tic-tac-toe-online-vercel.vercel.app', { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      });
      await page2.fill('input[placeholder="Enter your username"]', 'test');
      await page2.fill('input[placeholder="Enter your password"]', 'test123');
      await page2.click('button:has-text("Sign In")');
      await page2.waitForSelector('text=Game Lobby', { timeout: 60000 });
      
      console.log('✅ Both users logged in');
      
      // Wait for both users to be fully loaded
      await page1.waitForTimeout(3000);
      await page2.waitForTimeout(3000);
      
      // Check that neither user shows connection problems
      const fallback1 = page1.locator('text=Using Fallback');
      const fallback2 = page2.locator('text=Using Fallback');
      const notConnected1 = page1.locator('text=Not connected to server');
      const notConnected2 = page2.locator('text=Not connected to server');
      
      if (await fallback1.isVisible({ timeout: 2000 })) {
        throw new Error('User 1 shows "Using Fallback" status');
      }
      if (await fallback2.isVisible({ timeout: 2000 })) {
        throw new Error('User 2 shows "Using Fallback" status');
      }
      if (await notConnected1.isVisible({ timeout: 2000 })) {
        throw new Error('User 1 shows "Not connected to server"');
      }
      if (await notConnected2.isVisible({ timeout: 2000 })) {
        throw new Error('User 2 shows "Not connected to server"');
      }
      
      console.log('✅ Both users have proper connection status');
      
      // Test real-time interaction
      await page1.click('button:has-text("Create Game")');
      await page1.waitForSelector('input[placeholder*="game name"], input[placeholder*="Game name"]', { timeout: 10000 });
      await page1.fill('input[placeholder*="game name"], input[placeholder*="Game name"]', 'Two User Test Game');
      await page1.click('button:has-text("Create"), button:has-text("Start Game")');
      await page1.waitForSelector('text=Two User Test Game', { timeout: 15000 });
      
      // User 2 should see the game in real-time
      await page2.waitForSelector('text=Two User Test Game', { timeout: 15000 });
      console.log('✅ Real-time game visibility working');
      
      // User 2 joins the game
      await page2.click('text=Two User Test Game');
      await page2.click('button:has-text("Join Game")');
      
      // Both users should be in the game
      await page1.waitForSelector('text=Game in Progress', { timeout: 15000 });
      await page2.waitForSelector('text=Game in Progress', { timeout: 15000 });
      console.log('✅ Both users can join the same game');
      
      // Cleanup
      await page1.click('button:has-text("Leave Game"), button:has-text("Back to Lobby")');
      await page2.click('button:has-text("Leave Game"), button:has-text("Back to Lobby")');
      
      await page1.waitForSelector('text=Game Lobby', { timeout: 10000 });
      await page2.waitForSelector('text=Game Lobby', { timeout: 10000 });
      
      // Sign out both users
      await page1.click('button:has-text("Sign Out")');
      await page2.click('button:has-text("Sign Out")');
      
      await page1.waitForSelector('text=Welcome Back', { timeout: 10000 });
      await page2.waitForSelector('text=Welcome Back', { timeout: 10000 });
      
      console.log('🎉 Two users connection test PASSED!');
      console.log('✅ Both users have proper connection status');
      console.log('✅ Both users are connected to server');
      console.log('✅ Real-time interaction working between users');
      
    } catch (error) {
      console.error('❌ Two users connection test failed:', error);
      
      await page1.screenshot({ path: 'user1-connection-error.png', fullPage: true });
      await page2.screenshot({ path: 'user2-connection-error.png', fullPage: true });
      
      throw error;
    } finally {
      await context1.close();
      await context2.close();
    }
  });
}); 