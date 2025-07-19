import { test, expect } from '@playwright/test';

test('Production site basic functionality test', async ({ page }) => {
  // Navigate to the production app
  await page.goto('https://tic-tac-toe-online-vercel.vercel.app');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Check if we can see the login form
  await expect(page.locator('text=Welcome Back')).toBeVisible();
  
  // Check if the login form has the expected fields (using correct placeholders)
  await expect(page.locator('input[placeholder="Enter your username"]')).toBeVisible();
  await expect(page.locator('input[placeholder="Enter your password"]')).toBeVisible();
  
  // Try to login with demo user
  await page.fill('input[placeholder="Enter your username"]', 'demo');
  await page.fill('input[placeholder="Enter your password"]', 'demo123');
  
  // Click the sign in button
  await page.click('button:has-text("Sign In")');
  
  // Wait for the lobby to load (with longer timeout for production)
  await page.waitForSelector('text=Game Lobby', { timeout: 20000 });
  
  // Verify we're in the lobby
  await expect(page.locator('text=Welcome to the ultimate Tic-Tac-Toe experience!')).toBeVisible();
  
  console.log('Production site basic functionality test passed');
}); 