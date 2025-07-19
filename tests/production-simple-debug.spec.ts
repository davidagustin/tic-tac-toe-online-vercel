import { test, expect } from '@playwright/test';

test('Simple debug Pusher connection', async ({ page }) => {
  console.log('🔍 Simple debug of Pusher connection...');
  
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
    
    // Wait for page to settle
    await page.waitForTimeout(5000);
    
    // Get the Pusher debug info using a more specific selector
    console.log('🔍 Getting Pusher debug info...');
    
    const debugElement = page.locator('div.fixed.bottom-4.right-4.bg-black.bg-opacity-75.text-white.p-4.rounded-lg.text-xs.max-w-xs');
    const hasDebugElement = await debugElement.isVisible({ timeout: 3000 });
    
    if (hasDebugElement) {
      console.log('✅ Found Pusher debug element');
      const debugText = await debugElement.textContent();
      console.log('Pusher debug info:', debugText);
    } else {
      console.log('⚠️ No Pusher debug element found');
    }
    
    // Check connection status
    console.log('🔍 Checking connection status...');
    
    const connectionStatus = page.locator('div.inline-flex.items-center.px-4.py-2.rounded-full.text-sm.font-medium');
    const hasConnectionStatus = await connectionStatus.isVisible({ timeout: 3000 });
    
    if (hasConnectionStatus) {
      const statusText = await connectionStatus.textContent();
      console.log('Connection status:', statusText);
    } else {
      console.log('⚠️ No connection status element found');
    }
    
    // Check for "Not connected to server" message
    const notConnectedMessage = page.locator('div.text-red-400:has-text("⚠️ Not connected to server")');
    const hasNotConnectedMessage = await notConnectedMessage.isVisible({ timeout: 3000 });
    
    if (hasNotConnectedMessage) {
      console.log('❌ Found "Not connected to server" message');
      
      // Try to click "Test Connection" button if it exists
      const testConnectionButton = page.locator('button:has-text("Test Connection")');
      const hasTestButton = await testConnectionButton.isVisible({ timeout: 2000 });
      
      if (hasTestButton) {
        console.log('✅ Found Test Connection button, clicking it...');
        await testConnectionButton.click();
        await page.waitForTimeout(3000);
        
        // Check if connection improved
        const stillNotConnected = await notConnectedMessage.isVisible({ timeout: 2000 });
        if (!stillNotConnected) {
          console.log('✅ Connection test may have helped');
        } else {
          console.log('⚠️ Connection still not working after test');
        }
      }
    } else {
      console.log('✅ No "Not connected to server" message found');
    }
    
    console.log('🎉 Simple debug completed');
    
  } catch (error) {
    console.error('❌ Simple debug failed:', error);
    await page.screenshot({ path: 'simple-debug-error.png', fullPage: true });
  }
}); 