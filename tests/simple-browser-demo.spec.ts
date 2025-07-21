import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Simple Browser Demo', () => {
  test('Open browser and show the UI', async ({ browser }) => {
    // Create a browser context
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      console.log('🌐 Opening browser to:', BASE_URL);
      
      // Navigate to the app
      await page.goto(BASE_URL);
      console.log('✅ Page loaded');
      
      // Wait for the page to fully load
      await page.waitForTimeout(3000);
      
      // Take a screenshot to show the UI
      await page.screenshot({ path: 'browser-demo-screenshot.png', fullPage: true });
      console.log('📸 Screenshot saved: browser-demo-screenshot.png');
      
      // Check if we can see the login form
      const hasUsernameInput = await page.locator('input#username').isVisible();
      const hasPasswordInput = await page.locator('input#password').isVisible();
      const hasSubmitButton = await page.locator('button[type="submit"]').isVisible();
      
      console.log('🔍 UI Elements found:');
      console.log('  - Username input:', hasUsernameInput);
      console.log('  - Password input:', hasPasswordInput);
      console.log('  - Submit button:', hasSubmitButton);
      
      // Wait a bit to see the UI
      await page.waitForTimeout(5000);
      
      console.log('🎉 Browser demo completed successfully!');
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
      
      // Take error screenshot
      await page.screenshot({ path: 'browser-demo-error.png' });
      console.log('📸 Error screenshot saved: browser-demo-error.png');
      
      throw error;
    } finally {
      // Close browser context
      await context.close();
    }
  });
}); 