import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Show Browser UI', () => {
  test('Open browser and show the beautiful UI', async ({ browser }) => {
    // Create a browser context
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      console.log('🌐 Opening browser to:', BASE_URL);
      
      // Navigate to the app
      await page.goto(BASE_URL);
      console.log('✅ Page loaded successfully');
      
      // Wait for the page to fully load and render
      await page.waitForTimeout(3000);
      
      // Take a full page screenshot to show the beautiful UI
      await page.screenshot({ 
        path: 'beautiful-ui-screenshot.png', 
        fullPage: true 
      });
      console.log('📸 Beautiful UI screenshot saved: beautiful-ui-screenshot.png');
      
      // Check what elements are visible
      const elements = {
        usernameInput: await page.locator('input#username').isVisible(),
        passwordInput: await page.locator('input#password').isVisible(),
        submitButton: await page.locator('button[type="submit"]').isVisible(),
        signUpLink: await page.locator('button:has-text("Don\'t have an account? Sign up")').isVisible(),
        title: await page.locator('h1').isVisible(),
        gameIcon: await page.locator('span:has-text("🎮")').isVisible()
      };
      
      console.log('🔍 UI Elements found:');
      Object.entries(elements).forEach(([name, visible]) => {
        console.log(`  - ${name}: ${visible ? '✅' : '❌'}`);
      });
      
      // Wait longer to admire the beautiful UI
      console.log('⏰ Waiting 10 seconds to admire the beautiful UI...');
      await page.waitForTimeout(10000);
      
      console.log('🎉 Browser UI demo completed successfully!');
      console.log('✨ The Tic-Tac-Toe Online app has a beautiful, modern UI!');
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
      
      // Take error screenshot
      await page.screenshot({ path: 'ui-error.png' });
      console.log('📸 Error screenshot saved: ui-error.png');
      
      throw error;
    } finally {
      // Close browser context
      await context.close();
    }
  });
}); 