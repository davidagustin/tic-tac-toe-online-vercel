import { test, expect } from '@playwright/test';

test('Check connection status elements', async ({ page }) => {
  console.log('🔍 Checking specific connection status elements...');
  
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
    
    // Wait for lobby
    await page.waitForSelector('text=Game Lobby', { timeout: 60000 });
    console.log('✅ Login successful');
    
    // Wait for page to settle
    await page.waitForTimeout(5000);
    
    // Check for the specific "Using Fallback" element
    console.log('🔍 Checking for "Using Fallback" status...');
    const fallbackElement = page.locator('div.inline-flex.items-center.px-4.py-2.rounded-full.text-sm.font-medium.bg-yellow-500\\/20.text-yellow-300.border.border-yellow-400\\/30');
    const fallbackText = page.locator('text=Using Fallback');
    
    const fallbackVisible = await fallbackElement.isVisible({ timeout: 3000 }) || await fallbackText.isVisible({ timeout: 3000 });
    
    if (fallbackVisible) {
      console.log('❌ Found "Using Fallback" status - connection not proper');
      throw new Error('Connection status shows "Using Fallback"');
    } else {
      console.log('✅ No "Using Fallback" status found - connection is proper');
    }
    
    // Check for the specific "Not connected to server" element
    console.log('🔍 Checking for "Not connected to server" warning...');
    const notConnectedElement = page.locator('div.text-red-400.mb-2');
    const notConnectedText = page.locator('text=Not connected to server');
    
    const notConnectedVisible = await notConnectedElement.isVisible({ timeout: 3000 }) || await notConnectedText.isVisible({ timeout: 3000 });
    
    if (notConnectedVisible) {
      console.log('❌ Found "Not connected to server" warning - server connection failed');
      throw new Error('Server connectivity warning shows "Not connected to server"');
    } else {
      console.log('✅ No "Not connected to server" warning found - server connection is good');
    }
    
    // Look for positive connection indicators
    console.log('🔍 Looking for positive connection indicators...');
    
    // Check for green status indicators
    const greenStatus = page.locator('div.w-2.h-2.rounded-full.mr-2.bg-green-400, div.w-2.h-2.rounded-full.mr-2.bg-green-500');
    const greenVisible = await greenStatus.isVisible({ timeout: 3000 });
    
    if (greenVisible) {
      console.log('✅ Found green connection indicator - properly connected');
    } else {
      console.log('⚠️ No green connection indicator found');
    }
    
    // Check for "Connected" text
    const connectedText = page.locator('text=Connected');
    const connectedVisible = await connectedText.isVisible({ timeout: 3000 });
    
    if (connectedVisible) {
      console.log('✅ Found "Connected" text - properly connected');
    } else {
      console.log('⚠️ No "Connected" text found');
    }
    
    // Test real-time functionality
    console.log('🎮 Testing real-time functionality...');
    
    await page.click('button:has-text("Create Game")');
    await page.waitForSelector('input[placeholder*="game name"], input[placeholder*="Game name"]', { timeout: 10000 });
    await page.fill('input[placeholder*="game name"], input[placeholder*="Game name"]', 'Connection Check Game');
    await page.click('button:has-text("Create"), button:has-text("Start Game")');
    await page.waitForSelector('text=Connection Check Game', { timeout: 15000 });
    console.log('✅ Game creation successful - real-time working');
    
    // Clean up
    await page.click('text=Connection Check Game');
    await page.click('button:has-text("Leave Game"), button:has-text("Back to Lobby")');
    await page.waitForSelector('text=Game Lobby', { timeout: 10000 });
    
    // Sign out
    await page.click('button:has-text("Sign Out")');
    await page.waitForSelector('text=Welcome Back', { timeout: 15000 });
    
    console.log('🎉 Connection status check PASSED!');
    console.log('✅ No "Using Fallback" status found');
    console.log('✅ No "Not connected to server" warning found');
    console.log('✅ Real-time functionality working');
    
  } catch (error) {
    console.error('❌ Connection status check failed:', error);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'connection-check-error.png', fullPage: true });
    
    // Log current page state
    console.log('Current URL:', await page.url());
    console.log('Page title:', await page.title());
    
    throw error;
  }
}); 