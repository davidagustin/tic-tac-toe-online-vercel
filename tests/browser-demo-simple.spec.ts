import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Simple Browser Demo', () => {
  test('Show browser UI and basic interactions', async ({ browser }) => {
    // Create a browser context
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      console.log('🌐 Opening browser to:', BASE_URL);
      
      // Navigate to the app
      await page.goto(BASE_URL);
      console.log('✅ Page loaded successfully');
      
      // Wait for the page to fully load
      await page.waitForTimeout(3000);
      
      // Take initial screenshot
      await page.screenshot({ path: 'demo-initial.png', fullPage: true });
      console.log('📸 Initial screenshot saved');
      
      // Check UI elements
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
      
      // Wait to see the UI
      await page.waitForTimeout(2000);
      
      // Try to switch to registration mode
      console.log('🔄 Switching to registration mode...');
      await page.click('button:has-text("Don\'t have an account? Sign up")');
      await page.waitForTimeout(2000);
      
      // Take screenshot after switching
      await page.screenshot({ path: 'demo-registration-mode.png', fullPage: true });
      console.log('📸 Registration mode screenshot saved');
      
      // Fill in some form data (but don't submit)
      console.log('📝 Filling form data...');
      await page.fill('#username', 'demo-user');
      await page.fill('#password', 'demo-password');
      
      // Take screenshot with filled form
      await page.screenshot({ path: 'demo-filled-form.png', fullPage: true });
      console.log('📸 Filled form screenshot saved');
      
      // Wait to see the filled form
      await page.waitForTimeout(3000);
      
      // Switch back to login mode
      console.log('🔄 Switching back to login mode...');
      await page.click('button:has-text("Already have an account? Sign in")');
      await page.waitForTimeout(2000);
      
      // Take final screenshot
      await page.screenshot({ path: 'demo-final.png', fullPage: true });
      console.log('📸 Final screenshot saved');
      
      // Wait to see the final state
      await page.waitForTimeout(3000);
      
      console.log('🎉 Simple browser demo completed successfully!');
      console.log('📸 Screenshots saved:');
      console.log('  - demo-initial.png');
      console.log('  - demo-registration-mode.png');
      console.log('  - demo-filled-form.png');
      console.log('  - demo-final.png');
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
      
      // Take error screenshot
      await page.screenshot({ path: 'demo-error.png' });
      console.log('📸 Error screenshot saved: demo-error.png');
      
      throw error;
    } finally {
      // Close browser context
      await context.close();
    }
  });
}); 