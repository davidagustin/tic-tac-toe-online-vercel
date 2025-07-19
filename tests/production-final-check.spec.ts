import { test, expect } from '@playwright/test';

test('Final connection status check', async ({ page }) => {
  console.log('🔍 Final connection status check...');
  
  // Navigate to production
  await page.goto('https://tic-tac-toe-online-vercel.vercel.app', { 
    waitUntil: 'domcontentloaded',
    timeout: 30000 
  });
  
  // Verify login page loads
  await expect(page.locator('text=Welcome Back')).toBeVisible({ timeout: 10000 });
  console.log('✅ Login page loaded');
  
  // Login
  await page.fill('input[placeholder="Enter your username"]', 'demo');
  await page.fill('input[placeholder="Enter your password"]', 'demo123');
  await page.click('button:has-text("Sign In")');
  
  // Wait for lobby with extended timeout
  await page.waitForSelector('text=Game Lobby', { timeout: 90000 });
  console.log('✅ Login successful');
  
  // Wait for page to settle
  await page.waitForTimeout(3000);
  
  // Check for negative connection indicators
  console.log('🔍 Checking connection status...');
  
  // Check for "Using Fallback" - should NOT be visible
  const fallbackVisible = await page.locator('text=Using Fallback').isVisible({ timeout: 3000 });
  if (fallbackVisible) {
    throw new Error('❌ Found "Using Fallback" status - connection not proper');
  }
  console.log('✅ No "Using Fallback" status found');
  
  // Check for "Not connected to server" - should NOT be visible
  const notConnectedVisible = await page.locator('text=Not connected to server').isVisible({ timeout: 3000 });
  if (notConnectedVisible) {
    throw new Error('❌ Found "Not connected to server" warning - server connection failed');
  }
  console.log('✅ No "Not connected to server" warning found');
  
  // Test basic functionality
  console.log('🎮 Testing basic functionality...');
  await expect(page.locator('button:has-text("Create Game")')).toBeVisible({ timeout: 5000 });
  console.log('✅ Create Game button visible');
  
  // Sign out
  await page.click('button:has-text("Sign Out")');
  await page.waitForSelector('text=Welcome Back', { timeout: 10000 });
  console.log('✅ Sign out successful');
  
  console.log('🎉 Final connection check PASSED!');
  console.log('✅ Connection status is proper');
  console.log('✅ Server connectivity is good');
  console.log('✅ Basic functionality working');
}); 