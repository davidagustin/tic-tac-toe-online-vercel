import { test, expect } from '@playwright/test';

test.describe('Debug Infinite Loading Issue', () => {
  test('Identify loading issues step by step', async ({ page }) => {
    console.log('🚀 Starting diagnostic test...');
    
    // Navigate to the application
    await page.goto('http://localhost:3001');
    console.log('✅ Navigated to application');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded');
    
    // Check if we're on the login page
    const submitButton = await page.locator('[data-testid="submit-button"]');
    await expect(submitButton).toBeVisible();
    console.log('✅ Login page is visible');
    
    // Click "Create New Account"
    await page.click('button:has-text("Create New Account")');
    console.log('✅ Clicked Create New Account');
    
    // Wait for registration form
    await page.waitForSelector('input[name="userName"]');
    console.log('✅ Registration form loaded');
    
    // Fill registration form
    await page.fill('input[name="userName"]', 'TestPlayer');
    await page.fill('input[name="password"]', 'password123');
    console.log('✅ Filled registration form');
    
    // Submit registration
    await page.click('button[type="submit"]');
    console.log('✅ Submitted registration');
    
    // Wait for redirect and check where we end up
    try {
      await page.waitForURL('**/lobby**', { timeout: 10000 });
      console.log('✅ Successfully redirected to lobby');
    } catch (error) {
      console.log('❌ Failed to redirect to lobby, checking current URL...');
      const currentUrl = page.url();
      console.log('Current URL:', currentUrl);
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/registration-failed.png' });
      
      // Check if we're stuck on loading
      const loadingText = await page.locator('text=Loading Game...');
      if (await loadingText.isVisible()) {
        console.log('❌ Stuck on loading screen');
        
        // Check console errors
        const errors: string[] = [];
        page.on('console', msg => {
          if (msg.type() === 'error') {
            errors.push(msg.text());
            console.log('Console error:', msg.text());
          }
        });
        
        // Wait a bit more to collect errors
        await page.waitForTimeout(5000);
        
        // Check network requests
        const response = await page.waitForResponse('**/api/auth/register', { timeout: 5000 });
        console.log('Registration response status:', response.status());
        
        if (response.status() !== 200) {
          console.log('❌ Registration API failed');
          const responseText = await response.text();
          console.log('Response:', responseText);
        }
      }
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/final-state.png' });
    
    console.log('🏁 Diagnostic test completed');
  });
  
  test('Check API endpoints', async ({ page }) => {
    console.log('🔍 Checking API endpoints...');
    
    // Test Pusher config API
    const response = await page.request.get('http://localhost:3001/api/pusher-config');
    console.log('Pusher config API status:', response.status());
    if (response.status() === 200) {
      const config = await response.json();
      console.log('Pusher config:', config);
    }
    
    // Test events API
    const eventsResponse = await page.request.get('http://localhost:3001/api/events?channel=lobby');
    console.log('Events API status:', eventsResponse.status());
    
    // Test health check
    const healthResponse = await page.request.get('http://localhost:3001/api/health-check');
    console.log('Health check status:', healthResponse.status());
    
    console.log('✅ API endpoint check completed');
  });
}); 