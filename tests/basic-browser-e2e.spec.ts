import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Basic Browser E2E Demo', () => {
  test('Show browser UI interactions', async ({ browser }) => {
    // Create a browser context
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      console.log('🌐 Opening browser to:', BASE_URL);
      
      // Navigate to the app
      await page.goto(BASE_URL);
      console.log('✅ Page loaded');
      
      // Wait for the page to fully load
      await page.waitForTimeout(2000);
      
      // Take initial screenshot
      await page.screenshot({ path: 'initial-page.png' });
      console.log('📸 Initial page screenshot saved');
      
      // Check if we can see the login form
      const hasUsernameInput = await page.locator('input#username').isVisible();
      const hasPasswordInput = await page.locator('input#password').isVisible();
      
      console.log('🔍 Login form elements:');
      console.log('  - Username input:', hasUsernameInput);
      console.log('  - Password input:', hasPasswordInput);
      
      // Switch to registration mode
      console.log('🔄 Switching to registration mode...');
      await page.click('button:has-text("Don\'t have an account? Sign up")');
      await page.waitForTimeout(1000);
      
      // Take screenshot after switching to registration
      await page.screenshot({ path: 'registration-mode.png' });
      console.log('📸 Registration mode screenshot saved');
      
      // Fill in registration form
      console.log('📝 Filling registration form...');
      await page.fill('#username', 'testuser123');
      await page.fill('#password', 'password123');
      
      // Take screenshot with filled form
      await page.screenshot({ path: 'filled-form.png' });
      console.log('📸 Filled form screenshot saved');
      
      // Wait a moment to see the form
      await page.waitForTimeout(2000);
      
      // Click the create account button
      console.log('🎯 Clicking create account button...');
      await page.click('button:has-text("🎯 Create Account")');
      
      // Wait for registration to process
      await page.waitForTimeout(3000);
      
      // Take screenshot after registration attempt
      await page.screenshot({ path: 'after-registration.png' });
      console.log('📸 After registration screenshot saved');
      
      // Check if we're in the lobby
      const inLobby = await page.locator('text=Welcome, testuser123!').isVisible();
      console.log('🏠 In lobby:', inLobby);
      
      if (inLobby) {
        console.log('✅ Successfully registered and in lobby!');
        
        // Wait to see the lobby
        await page.waitForTimeout(3000);
        
        // Take lobby screenshot
        await page.screenshot({ path: 'lobby.png' });
        console.log('📸 Lobby screenshot saved');
        
        // Try to create a game
        console.log('🎮 Creating a game...');
        await page.fill('input[placeholder="Enter game name"]', 'Test Game');
        await page.click('button:has-text("Create Game")');
        
        // Wait for game creation
        await page.waitForTimeout(3000);
        
        // Take game screenshot
        await page.screenshot({ path: 'game-created.png' });
        console.log('📸 Game created screenshot saved');
        
        // Wait to see the game
        await page.waitForTimeout(3000);
        
      } else {
        console.log('❌ Registration may have failed');
      }
      
      console.log('🎉 Basic browser e2e demo completed!');
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
      
      // Take error screenshot
      await page.screenshot({ path: 'error-state.png' });
      console.log('📸 Error screenshot saved');
      
      throw error;
    } finally {
      // Close browser context
      await context.close();
    }
  });
}); 