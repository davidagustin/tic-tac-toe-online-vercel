import { test, expect } from '@playwright/test';

test('Final production test - fails on connection issues', async ({ page }) => {
  console.log('🎯 Running final production test - fails on connection issues...');
  
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
    
    // Check connection status - FAIL IMMEDIATELY if issues found
    console.log('🔍 Checking connection status...');
    
    // Check for "Not connected to server" warning - FAIL if found
    const connectionWarning = page.locator('div.text-red-400:has-text("⚠️ Not connected to server")');
    const hasConnectionWarning = await connectionWarning.isVisible({ timeout: 3000 });
    
    if (hasConnectionWarning) {
      console.log('❌ FAIL: Found connection warning: "⚠️ Not connected to server"');
      console.log('❌ Socket connection is not working properly');
      throw new Error('Connection test failed: "⚠️ Not connected to server" warning is visible');
    } else {
      console.log('✅ No connection warning found');
    }
    
    // Check for "Using Fallback" status - FAIL if found
    const fallbackStatus = page.locator('div:has-text("Using Fallback")');
    const hasFallbackStatus = await fallbackStatus.isVisible({ timeout: 3000 });
    
    if (hasFallbackStatus) {
      console.log('❌ FAIL: Found "Using Fallback" status');
      console.log('❌ App is not properly connected to real-time server');
      throw new Error('Connection test failed: "Using Fallback" status is visible');
    } else {
      console.log('✅ No fallback status found');
    }
    
    // Check for "Disconnected" status - FAIL if found
    const disconnectedStatus = page.locator('div:has-text("Disconnected")');
    const hasDisconnectedStatus = await disconnectedStatus.isVisible({ timeout: 3000 });
    
    if (hasDisconnectedStatus) {
      console.log('❌ FAIL: Found "Disconnected" status');
      console.log('❌ App is disconnected from server');
      throw new Error('Connection test failed: "Disconnected" status is visible');
    } else {
      console.log('✅ No disconnected status found');
    }
    
    // If we get here, connection is working properly
    console.log('✅ Connection status is proper - no warnings or fallback mode detected');
    
    // Test basic functionality - click Create Game button
    console.log('🎮 Testing Create Game button...');
    
    await page.click('text=Create Game');
    console.log('✅ Create Game button clicked');
    
    // Wait for the form to appear
    await page.waitForSelector('input[placeholder*="game name"], input[placeholder*="Game name"]', { timeout: 10000 });
    console.log('✅ Game creation form appeared');
    
    // Fill in the game name
    await page.fill('input[placeholder*="game name"], input[placeholder*="Game name"]', 'Final Test Game');
    console.log('✅ Game name filled');
    
    // Click create button
    await page.click('button:has-text("Create"), button:has-text("Start Game")');
    console.log('✅ Create button clicked');
    
    // Wait a moment for the request to process
    await page.waitForTimeout(3000);
    
    // Check if we're back to the lobby or if there's an error
    const availableGames = page.locator('text=Available Games');
    const errorMessage = page.locator('text=Error, text=Failed, text=error');
    
    if (await availableGames.isVisible({ timeout: 5000 })) {
      console.log('✅ Successfully returned to lobby after game creation');
    } else if (await errorMessage.isVisible({ timeout: 3000 })) {
      console.log('❌ Error occurred during game creation');
      throw new Error('Game creation failed with error');
    } else {
      console.log('❌ Game creation may have succeeded but UI state unclear');
      throw new Error('Game creation UI state unclear');
    }
    
    // Test navigation to chat tab
    console.log('💬 Testing chat navigation...');
    
    const chatTab = page.locator('button:has-text("💬 Chat")');
    if (await chatTab.isVisible({ timeout: 3000 })) {
      await chatTab.click();
      await page.waitForTimeout(2000);
      console.log('✅ Chat tab navigation successful');
    }
    
    // Test navigation back to games tab
    const gamesTab = page.locator('button:has-text("🎮 Games")');
    if (await gamesTab.isVisible({ timeout: 3000 })) {
      await gamesTab.click();
      await page.waitForTimeout(2000);
      console.log('✅ Games tab navigation successful');
    }
    
    // Sign out
    console.log('🚪 Testing sign out...');
    
    await page.click('text=Sign Out', { timeout: 10000 });
    await page.waitForSelector('text=Welcome Back', { timeout: 10000 });
    console.log('✅ Sign out successful');
    
    console.log('🎉 Final production test completed successfully!');
    console.log('✅ The app is working correctly with proper real-time connection');
    
  } catch (error) {
    console.error('❌ Final production test failed:', error);
    await page.screenshot({ path: 'production-final-passing-error.png', fullPage: true });
    throw error;
  }
}); 