import { test, expect } from '@playwright/test';

test('Production test that fails on connection issues', async ({ page }) => {
  console.log('🎯 Running production test that fails on connection issues...');
  
  try {
    // Navigate to production
    await page.goto('https://tic-tac-toe-online-vercel.vercel.app', { 
      waitUntil: 'domcontentloaded',
      timeout: 20000 
    });
    
    // Login
    await page.fill('input[placeholder="Enter your username"]', 'demo');
    await page.fill('input[placeholder="Enter your password"]', 'demo123');
    await page.click('button:has-text("Sign In")');
    console.log('✅ Login form submitted');
    
    // Wait for login to complete
    await page.waitForSelector('text=Welcome, demo!', { timeout: 30000 });
    console.log('✅ Login successful');
    
    // Check for main page elements
    await expect(page.locator('text=Welcome to Tic-Tac-Toe Online! 🎮')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Create Game')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Available Games')).toBeVisible({ timeout: 10000 });
    console.log('✅ Main page elements visible');
    
    // Check for connection status - FAIL IMMEDIATELY if issues found
    console.log('🔍 Checking connection status...');
    
    // Check for "Not connected to server" warning
    const connectionWarning = page.locator('div.text-red-400:has-text("⚠️ Not connected to server")');
    const hasConnectionWarning = await connectionWarning.isVisible({ timeout: 3000 });
    
    if (hasConnectionWarning) {
      console.log('❌ FAIL: Found connection warning: "⚠️ Not connected to server"');
      console.log('❌ Socket connection is not working properly');
      throw new Error('Connection test failed: "⚠️ Not connected to server" warning is visible');
    } else {
      console.log('✅ No connection warning found');
    }
    
    // Check for "Disconnected" status
    const disconnectedStatus = page.locator('div.inline-flex.items-center.px-4.py-2.rounded-full.text-sm.font-medium.bg-red-500\\/20.text-red-300.border.border-red-400\\/30:has-text("Disconnected")');
    const hasDisconnectedStatus = await disconnectedStatus.isVisible({ timeout: 3000 });
    
    if (hasDisconnectedStatus) {
      console.log('❌ FAIL: Found "Disconnected" status');
      throw new Error('Connection test failed: "Disconnected" status is visible');
    } else {
      console.log('✅ No "Disconnected" status found');
    }
    
    // Check for "Using Fallback" status
    const fallbackStatus = page.locator('div:has-text("Using Fallback")');
    const hasFallbackStatus = await fallbackStatus.isVisible({ timeout: 3000 });
    
    if (hasFallbackStatus) {
      console.log('❌ FAIL: Found "Using Fallback" status');
      throw new Error('Connection test failed: "Using Fallback" status is visible');
    } else {
      console.log('✅ No "Using Fallback" status found');
    }
    
    // If we get here, connection is good - test basic functionality
    console.log('🎮 Testing basic functionality...');
    
    // Try to create a game
    await page.click('text=Create Game');
    
    await page.waitForSelector('input[placeholder*="game name"], input[placeholder*="Game name"]', { timeout: 15000 });
    await page.fill('input[placeholder*="game name"], input[placeholder*="Game name"]', 'Connection Test Game');
    await page.click('button:has-text("Create"), button:has-text("Start Game")');
    
    // Wait for game to be created
    await page.waitForSelector('text=Connection Test Game', { timeout: 25000 });
    console.log('✅ Game creation successful');
    
    // Clean up - leave the game
    await page.click('text=Connection Test Game');
    await page.click('button:has-text("Leave Game"), button:has-text("Back to Lobby")');
    await page.waitForSelector('text=Available Games', { timeout: 15000 });
    
    // Test sign out
    console.log('🚪 Testing sign out...');
    await page.click('text=Sign Out', { timeout: 10000 });
    await page.waitForSelector('text=Welcome Back', { timeout: 15000 });
    console.log('✅ Sign out successful');
    
    console.log('🎉 Production test completed successfully!');
    console.log('✅ Login working');
    console.log('✅ Connection status good');
    console.log('✅ Game creation working');
    console.log('✅ Sign out working');
    
  } catch (error) {
    console.error('❌ Production test failed:', error);
    await page.screenshot({ path: 'connection-test-failure.png', fullPage: true });
    throw error; // Re-throw to make the test fail
  }
});

test('Connection status verification - fails on issues', async ({ page }) => {
  console.log('🔌 Connection status verification - fails on issues...');
  
  try {
    // Navigate and login
    await page.goto('https://tic-tac-toe-online-vercel.vercel.app', { 
      waitUntil: 'domcontentloaded',
      timeout: 20000 
    });
    
    await page.fill('input[placeholder="Enter your username"]', 'demo');
    await page.fill('input[placeholder="Enter your password"]', 'demo123');
    await page.click('button:has-text("Sign In")');
    
    await page.waitForSelector('text=Welcome, demo!', { timeout: 30000 });
    console.log('✅ Login successful');
    
    await page.waitForTimeout(3000);
    
    // Check for connection issues - FAIL IMMEDIATELY if found
    console.log('🔍 Checking for connection issues...');
    
    const connectionIssues = [
      { selector: 'div.text-red-400:has-text("⚠️ Not connected to server")', name: 'Server connection warning' },
      { selector: 'div.inline-flex.items-center.px-4.py-2.rounded-full.text-sm.font-medium.bg-red-500\\/20.text-red-300.border.border-red-400\\/30:has-text("Disconnected")', name: 'Disconnected status' },
      { selector: 'div:has-text("Using Fallback")', name: 'Fallback mode' }
    ];
    
    for (const issue of connectionIssues) {
      try {
        const element = page.locator(issue.selector);
        if (await element.isVisible({ timeout: 2000 })) {
          console.log(`❌ FAIL: Found ${issue.name}`);
          throw new Error(`Connection test failed: ${issue.name} is visible`);
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes('Connection test failed')) {
          throw e; // Re-throw connection test failures
        }
        // Element not found - this is good
      }
    }
    
    console.log('✅ No connection issues found');
    
    // Test basic page functionality
    await expect(page.locator('text=Create Game')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Available Games')).toBeVisible({ timeout: 10000 });
    console.log('✅ Basic page functionality working');
    
    console.log('📊 Summary:');
    console.log('✅ Connection status good');
    console.log('✅ Basic functionality working');
    console.log('✅ Test passed - no connection issues detected');
    
  } catch (error) {
    console.error('❌ Connection verification failed:', error);
    await page.screenshot({ path: 'connection-verification-failure.png', fullPage: true });
    throw error; // Re-throw to make the test fail
  }
}); 