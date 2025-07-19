import { test, expect } from '@playwright/test';

test('Test Pusher connection with detailed logging', async ({ page }) => {
  console.log('🔍 Testing Pusher connection with detailed logging...');
  
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
    
    // Inject a script to test Pusher connection directly
    console.log('🔍 Testing Pusher connection directly...');
    
    const pusherTestResult = await page.evaluate(async () => {
      try {
        // Fetch Pusher config
        const response = await fetch('/api/pusher-config');
        const config = await response.json();
        
        console.log('Pusher config:', config);
        
        // Create a test Pusher client
        const Pusher = (window as any).Pusher;
        if (!Pusher) {
          return { error: 'Pusher library not loaded' };
        }
        
        const testPusher = new Pusher(config.key, {
          cluster: config.cluster,
          forceTLS: true,
          enabledTransports: ['ws', 'wss', 'xhr_streaming', 'xhr_polling'],
          disableStats: true,
        });
        
        return new Promise((resolve) => {
          let result: any = { status: 'testing' };
          
          testPusher.connection.bind('connecting', () => {
            console.log('Pusher: Connecting...');
            result.connecting = true;
          });
          
          testPusher.connection.bind('connected', () => {
            console.log('Pusher: Connected successfully!');
            result.connected = true;
            result.success = true;
            testPusher.disconnect();
            resolve(result);
          });
          
          testPusher.connection.bind('disconnected', () => {
            console.log('Pusher: Disconnected');
            result.disconnected = true;
          });
          
          testPusher.connection.bind('error', (error: any) => {
            console.error('Pusher: Connection error:', error);
            result.error = {
              message: error.message,
              code: error.code,
              data: error.data
            };
            testPusher.disconnect();
            resolve(result);
          });
          
          // Set a timeout
          setTimeout(() => {
            if (!result.success && !result.error) {
              result.timeout = true;
              result.error = { message: 'Connection timeout' };
              testPusher.disconnect();
              resolve(result);
            }
          }, 10000);
        });
        
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });
    
    console.log('Pusher test result:', pusherTestResult);
    
    // Check for connection status in the UI
    console.log('🔍 Checking UI connection status...');
    
    const connectionStatus = page.locator('div.inline-flex.items-center.px-4.py-2.rounded-full.text-sm.font-medium');
    const hasConnectionStatus = await connectionStatus.isVisible({ timeout: 3000 });
    
    if (hasConnectionStatus) {
      const statusText = await connectionStatus.textContent();
      console.log('UI Connection status:', statusText);
    }
    
    // Check for "Not connected to server" message
    const notConnectedMessage = page.locator('div.text-red-400:has-text("⚠️ Not connected to server")');
    const hasNotConnectedMessage = await notConnectedMessage.isVisible({ timeout: 3000 });
    
    if (hasNotConnectedMessage) {
      console.log('❌ Found "Not connected to server" message in UI');
    } else {
      console.log('✅ No "Not connected to server" message found in UI');
    }
    
    // Check browser console for any errors
    console.log('🔍 Checking browser console for errors...');
    
    const consoleErrors = await page.evaluate(() => {
      return (window as any).consoleErrors || [];
    });
    
    if (consoleErrors.length > 0) {
      console.log('Browser console errors:', consoleErrors);
    } else {
      console.log('No console errors found');
    }
    
    // Check network requests
    console.log('🔍 Checking network requests...');
    
    const networkRequests = await page.evaluate(() => {
      return (window as any).networkRequests || [];
    });
    
    if (networkRequests.length > 0) {
      console.log('Network requests:', networkRequests);
    }
    
    console.log('🎉 Pusher connection test completed');
    
  } catch (error) {
    console.error('❌ Pusher connection test failed:', error);
    await page.screenshot({ path: 'pusher-connection-test-error.png', fullPage: true });
  }
}); 