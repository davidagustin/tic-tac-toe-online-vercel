import { test, expect } from '@playwright/test';

test('Check Pusher connection status in production', async ({ page }) => {
  console.log('🔍 Checking Pusher connection status...');
  
  try {
    // Navigate to production
    await page.goto('https://tic-tac-toe-online-vercel.vercel.app', { 
      waitUntil: 'domcontentloaded',
      timeout: 20000 
    });
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Take a screenshot to see what's on the page
    await page.screenshot({ path: 'production-page-check.png', fullPage: true });
    console.log('📸 Screenshot saved as production-page-check.png');
    
    // Check what's on the page
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);
    
    const pageText = await page.textContent('body');
    console.log('Page content preview:', pageText?.substring(0, 500));
    
    // Check for login form or other elements
    const loginForm = page.locator('input[placeholder*="username"], input[placeholder*="Username"]');
    const welcomeText = page.locator('text=Welcome Back, text=Sign In, text=Login');
    
    if (await loginForm.isVisible({ timeout: 3000 })) {
      console.log('✅ Login form found');
      
      // Login
      await page.fill('input[placeholder*="username"], input[placeholder*="Username"]', 'demo');
      await page.fill('input[placeholder*="password"], input[placeholder*="Password"]', 'demo123');
      await page.click('button:has-text("Sign In"), button:has-text("Login")');
      
      // Wait for login to complete
      await page.waitForSelector('text=Welcome, demo!, text=Game Lobby', { timeout: 30000 });
      
      // Wait a bit for connection to establish
      await page.waitForTimeout(5000);
      
      // Check for connection status
      console.log('🔍 Checking connection indicators...');
      
      // Look for any connection-related text
      const connectionTexts = await page.locator('div').filter({ hasText: /connected|connection|pusher|socket/i }).allTextContents();
      console.log('Connection-related texts found:', connectionTexts);
      
      // Check for specific status indicators
      const statusIndicators = [
        'Connected',
        'Disconnected', 
        'Not connected to server',
        'Using Fallback',
        'Connected to Pusher',
        'Pusher connected'
      ];
      
      for (const status of statusIndicators) {
        const element = page.locator(`text=${status}`);
        if (await element.isVisible({ timeout: 1000 })) {
          console.log(`✅ Found status: "${status}"`);
        }
      }
      
      // Take a screenshot for manual inspection
      await page.screenshot({ path: 'connection-status-check.png', fullPage: true });
      console.log('📸 Screenshot saved as connection-status-check.png');
      
    } else if (await welcomeText.isVisible({ timeout: 3000 })) {
      console.log('✅ Already logged in or on welcome page');
      
      // Check for connection status directly
      console.log('🔍 Checking connection indicators...');
      
      // Look for any connection-related text
      const connectionTexts = await page.locator('div').filter({ hasText: /connected|connection|pusher|socket/i }).allTextContents();
      console.log('Connection-related texts found:', connectionTexts);
      
      // Take a screenshot for manual inspection
      await page.screenshot({ path: 'connection-status-check.png', fullPage: true });
      console.log('📸 Screenshot saved as connection-status-check.png');
      
    } else {
      console.log('❌ Neither login form nor welcome text found');
      console.log('Page content:', await page.textContent('body'));
    }
    
    console.log('✅ Connection check completed');
    
  } catch (error) {
    console.error('❌ Connection check failed:', error);
    await page.screenshot({ path: 'connection-check-error.png', fullPage: true });
    throw error;
  }
}); 