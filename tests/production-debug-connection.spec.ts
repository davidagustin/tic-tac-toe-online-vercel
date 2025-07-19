import { test, expect } from '@playwright/test';

test('Debug Pusher connection issue', async ({ page }) => {
  console.log('🔍 Debugging Pusher connection issue...');
  
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
    
    // Check browser console for Pusher connection logs
    console.log('🔍 Checking browser console for Pusher logs...');
    
    // Get console logs
    const logs = await page.evaluate(() => {
      return (window as any).consoleLogs || [];
    });
    
    console.log('Browser console logs:', logs);
    
    // Check for Pusher connection status in the page
    console.log('🔍 Checking Pusher connection status...');
    
    // Look for any Pusher-related elements or debug info
    const pusherDebugInfo = page.locator('div:has-text("Pusher Debug Info")');
    const hasPusherDebug = await pusherDebugInfo.isVisible({ timeout: 2000 });
    
    if (hasPusherDebug) {
      console.log('✅ Found Pusher debug info');
      const debugText = await pusherDebugInfo.textContent();
      console.log('Pusher debug info:', debugText);
    } else {
      console.log('⚠️ No Pusher debug info found');
    }
    
    // Check for connection status element
    const connectionStatus = page.locator('div:has-text("Disconnected"), div:has-text("Connected"), div:has-text("Using Fallback")');
    const connectionText = await connectionStatus.textContent();
    console.log('Connection status text:', connectionText);
    
    // Check for "Not connected to server" message
    const notConnectedMessage = page.locator('div:has-text("⚠️ Not connected to server")');
    const hasNotConnectedMessage = await notConnectedMessage.isVisible({ timeout: 2000 });
    
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
    
    // Check network requests for Pusher
    console.log('🔍 Checking network requests...');
    
    // Listen for network requests
    page.on('request', request => {
      if (request.url().includes('pusher') || request.url().includes('pusherapp')) {
        console.log('Pusher request:', request.url());
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('pusher') || response.url().includes('pusherapp')) {
        console.log('Pusher response:', response.url(), response.status());
      }
    });
    
    // Wait a bit more to see if connection improves
    await page.waitForTimeout(5000);
    
    // Final check
    const finalConnectionStatus = page.locator('div:has-text("Disconnected"), div:has-text("Connected"), div:has-text("Using Fallback")');
    const finalConnectionText = await finalConnectionStatus.textContent();
    console.log('Final connection status:', finalConnectionText);
    
    console.log('🎉 Debug completed');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    await page.screenshot({ path: 'debug-connection-error.png', fullPage: true });
  }
}); 