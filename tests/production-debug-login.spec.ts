import { test, expect } from '@playwright/test';

test('Debug login - see what text appears after login', async ({ page }) => {
  console.log('🔍 Debugging login to see actual text...');
  
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
    
    // Wait a bit and then check what's on the page
    await page.waitForTimeout(5000);
    
    console.log('🔍 Checking what text appears after login...');
    console.log('Current URL:', await page.url());
    console.log('Page title:', await page.title());
    
    // Get all text content on the page
    const pageText = await page.textContent('body');
    console.log('Page text (first 1000 chars):', pageText?.substring(0, 1000));
    
    // Look for common elements that might indicate successful login
    const possibleSelectors = [
      'text=Game Lobby',
      'text=Lobby',
      'text=Welcome',
      'text=Games',
      'text=Create Game',
      'text=Join Game',
      'text=Stats',
      'text=Sign Out',
      'text=demo',
      'text=Dashboard',
      'text=Home',
      'text=Games List',
      'text=Available Games',
      'text=My Games',
      'text=Game Room',
      'text=Play',
      'text=Start',
      'text=Ready',
      'text=Online',
      'text=Connected'
    ];
    
    console.log('🔍 Checking for various text elements...');
    for (const selector of possibleSelectors) {
      try {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 2000 })) {
          console.log(`✅ Found: ${selector}`);
        }
      } catch (e) {
        // Element not found
      }
    }
    
    // Check for any buttons
    console.log('🔍 Checking for buttons...');
    const buttons = await page.locator('button').all();
    for (let i = 0; i < buttons.length; i++) {
      try {
        const text = await buttons[i].textContent();
        console.log(`Button ${i}: ${text}`);
      } catch (e) {
        console.log(`Button ${i}: [text not accessible]`);
      }
    }
    
    // Check for any headings
    console.log('🔍 Checking for headings...');
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    for (let i = 0; i < headings.length; i++) {
      try {
        const text = await headings[i].textContent();
        console.log(`Heading ${i}: ${text}`);
      } catch (e) {
        console.log(`Heading ${i}: [text not accessible]`);
      }
    }
    
    // Take a screenshot for visual debugging
    await page.screenshot({ path: 'debug-login.png', fullPage: true });
    console.log('📸 Screenshot saved as debug-login.png');
    
    console.log('🎉 Debug login completed!');
    
  } catch (error) {
    console.error('❌ Debug login failed:', error);
    await page.screenshot({ path: 'debug-error.png', fullPage: true });
  }
}); 