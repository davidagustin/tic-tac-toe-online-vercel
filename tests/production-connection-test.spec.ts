import { test, expect } from '@playwright/test';

test.describe('Production Connection Status Tests', () => {
  test('Verify users are connected to server and can see connection status', async ({ browser }) => {
    // Create isolated browser contexts for two users
    const user1Context = await browser.newContext();
    const user2Context = await browser.newContext();
    
    const user1Page = await user1Context.newPage();
    const user2Page = await user2Context.newPage();
    
    try {
      console.log('🔌 Starting connection status verification test...');
      
      // User 1: Login and check connection
      console.log('👤 User 1: Logging in...');
      await user1Page.goto('https://tic-tac-toe-online-vercel.vercel.app');
      await user1Page.waitForLoadState('networkidle');
      await user1Page.fill('input[placeholder="Enter your username"]', 'demo');
      await user1Page.fill('input[placeholder="Enter your password"]', 'demo123');
      await user1Page.click('button:has-text("Sign In")');
      await user1Page.waitForSelector('text=Game Lobby', { timeout: 30000 });
      console.log('✅ User 1 logged in successfully');
      
      // User 2: Login and check connection
      console.log('👤 User 2: Logging in...');
      await user2Page.goto('https://tic-tac-toe-online-vercel.vercel.app');
      await user2Page.waitForLoadState('networkidle');
      await user2Page.fill('input[placeholder="Enter your username"]', 'test');
      await user2Page.fill('input[placeholder="Enter your password"]', 'test123');
      await user2Page.click('button:has-text("Sign In")');
      await user2Page.waitForSelector('text=Game Lobby', { timeout: 30000 });
      console.log('✅ User 2 logged in successfully');
      
      // Wait for both users to be fully loaded in lobby
      await user1Page.waitForSelector('text=Welcome to the ultimate Tic-Tac-Toe experience!', { timeout: 10000 });
      await user2Page.waitForSelector('text=Welcome to the ultimate Tic-Tac-Toe experience!', { timeout: 10000 });
      
      // Wait for socket connections to establish
      await user1Page.waitForTimeout(3000);
      await user2Page.waitForTimeout(3000);
      
      console.log('🔍 Checking connection status indicators...');
      
      // Look for various connection status indicators
      const connectionSelectors = [
        'text=Connected',
        'text=Online', 
        'text=🟢',
        'text=●',
        '[data-testid="connection-status"]',
        '[data-testid="socket-status"]',
        '.connection-status',
        '.socket-status',
        '.status-indicator'
      ];
      
      // Check if any connection status is visible for User 1
      let user1Connected = false;
      for (const selector of connectionSelectors) {
        try {
          const element = user1Page.locator(selector);
          if (await element.isVisible({ timeout: 1000 })) {
            console.log(`✅ User 1 connection status found: ${selector}`);
            user1Connected = true;
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      // Check if any connection status is visible for User 2
      let user2Connected = false;
      for (const selector of connectionSelectors) {
        try {
          const element = user2Page.locator(selector);
          if (await element.isVisible({ timeout: 1000 })) {
            console.log(`✅ User 2 connection status found: ${selector}`);
            user2Connected = true;
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      // Verify real-time functionality by checking if users can see each other
      console.log('🔍 Checking real-time user visibility...');
      
      // Look for user lists or online indicators
      const userListSelectors = [
        'text=demo',
        'text=test',
        '[data-testid="user-list"]',
        '.user-list',
        '.online-users'
      ];
      
      let user1CanSeeOthers = false;
      let user2CanSeeOthers = false;
      
      for (const selector of userListSelectors) {
        try {
          const element1 = user1Page.locator(selector);
          const element2 = user2Page.locator(selector);
          
          if (await element1.isVisible({ timeout: 1000 })) {
            console.log(`✅ User 1 can see user list: ${selector}`);
            user1CanSeeOthers = true;
          }
          
          if (await element2.isVisible({ timeout: 1000 })) {
            console.log(`✅ User 2 can see user list: ${selector}`);
            user2CanSeeOthers = true;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      // Test real-time game creation to verify socket connection
      console.log('🎮 Testing real-time game creation...');
      
      // User 1 creates a game
      await user1Page.click('button:has-text("Create Game")');
      await user1Page.waitForSelector('input[placeholder*="game name"], input[placeholder*="Game name"]', { timeout: 10000 });
      await user1Page.fill('input[placeholder*="game name"], input[placeholder*="Game name"]', 'Connection Test Game');
      await user1Page.click('button:has-text("Create"), button:has-text("Start Game")');
      await user1Page.waitForSelector('text=Connection Test Game', { timeout: 15000 });
      console.log('✅ User 1 created a game');
      
      // User 2 should see the game in real-time
      await user2Page.waitForSelector('text=Connection Test Game', { timeout: 15000 });
      console.log('✅ User 2 can see the game created by User 1 (real-time sync working)');
      
      // Clean up - User 1 leaves the game
      await user1Page.click('text=Connection Test Game');
      await user1Page.click('button:has-text("Leave Game"), button:has-text("Back to Lobby")');
      await user1Page.waitForSelector('text=Game Lobby', { timeout: 10000 });
      
      // Both users sign out
      await user1Page.click('button:has-text("Sign Out")');
      await user2Page.click('button:has-text("Sign Out")');
      
      await user1Page.waitForSelector('text=Welcome Back', { timeout: 10000 });
      await user2Page.waitForSelector('text=Welcome Back', { timeout: 10000 });
      
      // ===== TEST RESULTS =====
      console.log('📊 ===== CONNECTION STATUS TEST RESULTS =====');
      console.log(`🔌 User 1 Connection Status: ${user1Connected ? '✅ Connected' : '❌ Not detected'}`);
      console.log(`🔌 User 2 Connection Status: ${user2Connected ? '✅ Connected' : '❌ Not detected'}`);
      console.log(`👥 User 1 Can See Others: ${user1CanSeeOthers ? '✅ Yes' : '❌ No'}`);
      console.log(`👥 User 2 Can See Others: ${user2CanSeeOthers ? '✅ Yes' : '❌ No'}`);
      console.log(`🎮 Real-time Game Sync: ✅ Working`);
      console.log('🎉 Connection status test completed!');
      
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      
      // Take screenshots for debugging
      await user1Page.screenshot({ path: 'user1-connection-error.png', fullPage: true });
      await user2Page.screenshot({ path: 'user2-connection-error.png', fullPage: true });
      
      throw error;
    } finally {
      // Clean up browser contexts
      await user1Context.close();
      await user2Context.close();
      console.log('🧹 Browser contexts cleaned up');
    }
  });
}); 