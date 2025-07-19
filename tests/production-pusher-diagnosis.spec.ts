import { test, expect } from '@playwright/test';

test('Diagnose Pusher connection issue', async ({ page }) => {
  console.log('🔍 Diagnosing Pusher connection issue...');
  
  try {
    // Navigate to production
    await page.goto('https://tic-tac-toe-online-vercel.vercel.app', { 
      waitUntil: 'domcontentloaded',
      timeout: 20000 
    });
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Test 1: Check Pusher configuration
    console.log('📋 Test 1: Checking Pusher configuration...');
    const configResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/pusher-config');
        return await response.json();
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });
    
    console.log('Pusher config:', configResponse);
    
    // Test 2: Check server-side Pusher connection
    console.log('📋 Test 2: Checking server-side Pusher connection...');
    const serverTestResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/test-pusher-connection');
        return await response.json();
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });
    
    console.log('Server test response:', serverTestResponse);
    
    // Test 3: Check if Pusher app is accessible
    console.log('📋 Test 3: Checking Pusher app accessibility...');
    const pusherAppTest: any = await page.evaluate(async () => {
      try {
        // Try to connect to Pusher app directly
        const config = await fetch('/api/pusher-config').then(r => r.json());
        
        // Test WebSocket connection
        const wsUrl = `wss://ws-${config.cluster}.pusherapp.com/app/${config.key}?protocol=7&client=js&version=8.4.0&flash=false`;
        console.log('Attempting WebSocket connection to:', wsUrl);
        
        return new Promise((resolve) => {
          const ws = new WebSocket(wsUrl);
          
          ws.onopen = () => {
            console.log('WebSocket connection opened successfully');
            ws.close();
            resolve({ success: true, message: 'WebSocket connection successful' });
          };
          
          ws.onerror = (error) => {
            console.log('WebSocket connection failed:', error);
            resolve({ success: false, error: 'WebSocket connection failed', details: error });
          };
          
          ws.onclose = () => {
            console.log('WebSocket connection closed');
          };
          
          // Timeout after 5 seconds
          setTimeout(() => {
            if (ws.readyState === WebSocket.CONNECTING) {
              ws.close();
              resolve({ success: false, error: 'WebSocket connection timeout' });
            }
          }, 5000);
        });
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });
    
    console.log('Pusher app test:', pusherAppTest as any);
    
    // Test 4: Check browser console for specific errors
    console.log('📋 Test 4: Checking browser console errors...');
    const consoleErrors = await page.evaluate(() => {
      const errors: string[] = [];
      
      // Override console.error to capture errors
      const originalError = console.error;
      console.error = (...args: any[]) => {
        errors.push(args.join(' '));
        originalError.apply(console, args);
      };
      
      return errors;
    });
    
    console.log('Console errors:', consoleErrors);
    
    // Test 5: Check network requests
    console.log('📋 Test 5: Checking network requests...');
    const networkRequests = await page.evaluate(() => {
      const requests: any[] = [];
      
      // Override fetch to capture requests
      const originalFetch = window.fetch;
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input.toString();
        if (url.includes('pusher') || url.includes('pusherapp')) {
          requests.push({ type: 'fetch', url, timestamp: new Date().toISOString() });
        }
        return originalFetch.call(window, input, init);
      };
      
      return requests;
    });
    
    console.log('Network requests:', networkRequests);
    
    // Test 6: Check if the app is in fallback mode
    console.log('📋 Test 6: Checking fallback mode...');
    const fallbackStatus = await page.evaluate(() => {
      const fallbackElements = document.querySelectorAll('*');
      const fallbackTexts: string[] = [];
      
      fallbackElements.forEach(el => {
        const text = el.textContent;
        if (text && (text.includes('fallback') || text.includes('Fallback') || text.includes('Not connected'))) {
          fallbackTexts.push(text.trim());
        }
      });
      
      return fallbackTexts;
    });
    
    console.log('Fallback status texts:', fallbackStatus);
    
    // Summary
    console.log('📊 DIAGNOSIS SUMMARY:');
    console.log('1. Pusher Config:', configResponse.key ? '✅ Set' : '❌ Missing');
    console.log('2. Server Connection:', serverTestResponse.success ? '✅ Working' : '❌ Failed');
    console.log('3. WebSocket Connection:', pusherAppTest.success ? '✅ Working' : '❌ Failed');
    console.log('4. Console Errors:', consoleErrors.length > 0 ? '❌ Found' : '✅ None');
    console.log('5. Fallback Mode:', fallbackStatus.length > 0 ? '⚠️ Active' : '✅ Not active');
    
    // Take a screenshot
    await page.screenshot({ path: 'pusher-diagnosis.png', fullPage: true });
    console.log('📸 Screenshot saved as pusher-diagnosis.png');
    
    console.log('✅ Diagnosis completed');
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
    await page.screenshot({ path: 'pusher-diagnosis-error.png', fullPage: true });
    throw error;
  }
}); 