import { test, expect } from '@playwright/test';

test.describe('Simple Registration Test', () => {
  test('Register and reach lobby', async ({ page }) => {
    console.log('🚀 Starting simple registration test...');
    
    // Navigate to the application
    await page.goto('http://localhost:3000');
    console.log('✅ Navigated to application');
    
    // Wait for login page
    await page.waitForSelector('[data-testid="submit-button"]');
    console.log('✅ Login page loaded');
    
    // Click "Create New Account"
    await page.click('button:has-text("Create New Account")');
    await page.waitForSelector('[data-testid="username-input"]');
    console.log('✅ Registration form loaded');
    
    // Fill and submit registration
    const username = `Player${Date.now() % 1000}`;
    await page.fill('[data-testid="username-input"]', username);
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="submit-button"]');
    console.log('✅ Registration submitted for user:', username);
    
    // Wait for lobby to appear (skip success message check)
    await page.waitForSelector('button:has-text("Create Game")', { timeout: 15000 });
    console.log('✅ Lobby loaded successfully');
    
    // Verify we're in the lobby
    await page.waitForSelector('text=Welcome to Tic-Tac-Toe Online!', { timeout: 5000 });
    console.log('✅ Lobby welcome message confirmed');
    
    // Take success screenshot
    await page.screenshot({ path: 'test-results/simple-registration-success.png' });
    
    console.log('🏁 Simple registration test passed successfully!');
  });
}); 