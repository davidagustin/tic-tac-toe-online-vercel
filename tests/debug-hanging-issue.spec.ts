import { test, expect } from '@playwright/test';

test.describe('Debug Hanging Issue', () => {
  test('Identify where the application hangs', async ({ page }) => {
    console.log('🚀 Starting hanging debug test...');
    
    // Set a reasonable timeout
    page.setDefaultTimeout(15000);
    
    // Navigate to the application
    console.log('📱 Navigating to application...');
    await page.goto('http://localhost:3001');
    console.log('✅ Navigation completed');
    
    // Wait for page to load
    console.log('⏳ Waiting for page to load...');
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded');
    
    // Check if we're on the login page
    console.log('🔍 Checking login page...');
    const submitButton = await page.locator('[data-testid="submit-button"]');
    await expect(submitButton).toBeVisible();
    console.log('✅ Login page is visible');
    
    // Click "Create New Account"
    console.log('👆 Clicking Create New Account...');
    await page.click('button:has-text("Create New Account")');
    console.log('✅ Clicked Create New Account');
    
    // Wait for registration form
    console.log('⏳ Waiting for registration form...');
    await page.waitForSelector('input[name="userName"]', { timeout: 10000 });
    console.log('✅ Registration form loaded');
    
    // Fill registration form
    console.log('✍️ Filling registration form...');
    await page.fill('input[name="userName"]', 'TestPlayer');
    await page.fill('input[name="password"]', 'password123');
    console.log('✅ Filled registration form');
    
    // Submit registration
    console.log('📤 Submitting registration...');
    await page.click('button[type="submit"]');
    console.log('✅ Submitted registration');
    
    // Wait for response and check where we end up
    console.log('⏳ Waiting for registration response...');
    
    try {
      // Wait for either redirect to lobby or loading screen
      await Promise.race([
        page.waitForURL('**/lobby**', { timeout: 10000 }),
        page.waitForSelector('text=Loading Game...', { timeout: 10000 })
      ]);
      
      const currentUrl = page.url();
      console.log('📍 Current URL:', currentUrl);
      
      if (currentUrl.includes('/lobby')) {
        console.log('✅ Successfully redirected to lobby');
      } else {
        console.log('❌ Stuck on loading screen');
        
        // Take screenshot
        await page.screenshot({ path: 'test-results/hanging-loading-screen.png' });
        
        // Check for console errors
        const errors: string[] = [];
        page.on('console', msg => {
          if (msg.type() === 'error') {
            errors.push(msg.text());
            console.log('❌ Console error:', msg.text());
          }
        });
        
        // Wait a bit more to collect errors
        await page.waitForTimeout(5000);
        
        // Check if we're still on loading screen
        const loadingText = await page.locator('text=Loading Game...');
        if (await loadingText.isVisible()) {
          console.log('❌ Still stuck on loading screen after 5 seconds');
          
          // Check network requests
          try {
            const response = await page.waitForResponse('**/api/auth/register', { timeout: 5000 });
            console.log('📡 Registration response status:', response.status());
            
            if (response.status() !== 200) {
              console.log('❌ Registration API failed');
              const responseText = await response.text();
              console.log('📄 Response:', responseText);
            }
          } catch (error) {
            console.log('❌ No registration response received');
          }
        }
      }
    } catch (error) {
      console.log('❌ Timeout waiting for response');
      const currentUrl = page.url();
      console.log('📍 Final URL:', currentUrl);
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/timeout-error.png' });
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/final-state.png' });
    
    console.log('🏁 Debug test completed');
  });
  
  test('Check API endpoints for hanging', async ({ page }) => {
    console.log('🔍 Checking API endpoints...');
    
    // Test each API endpoint with timeout
    const endpoints = [
      '/api/pusher-config',
      '/api/events?channel=lobby',
      '/api/health-check',
      '/api/game/list'
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`📡 Testing ${endpoint}...`);
        const response = await page.request.get(`http://localhost:3001${endpoint}`, {
          timeout: 10000
        });
        console.log(`✅ ${endpoint} - Status: ${response.status()}`);
      } catch (error) {
        console.log(`❌ ${endpoint} - Error: ${error}`);
      }
    }
    
    console.log('✅ API endpoint check completed');
  });
}); 