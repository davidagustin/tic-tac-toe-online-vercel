import { test, expect } from '@playwright/test';

test('Sign out cleanup test', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:3000');
  
  // Wait for the login form to be visible
  await page.waitForSelector('text=Welcome Back', { timeout: 10000 });
  
  // Fill in the login form with demo user
  await page.fill('input[placeholder="Enter your username..."]', 'demo');
  await page.fill('input[placeholder="Enter your password..."]', 'demo123');
  
  // Click the sign in button
  await page.click('button:has-text("Sign In")');
  
  // Wait for the lobby to load
  await page.waitForSelector('text=Game Lobby', { timeout: 15000 });
  
  // Wait for the lobby content to load
  await page.waitForSelector('text=Welcome to the ultimate Tic-Tac-Toe experience!', { timeout: 10000 });
  
  // Create a game to test cleanup
  await page.click('button:has-text("Create Game")');
  
  // Wait for game creation form
  await page.waitForSelector('input[placeholder*="game name"], input[placeholder*="Game name"]', { timeout: 5000 });
  
  // Fill in game name
  await page.fill('input[placeholder*="game name"], input[placeholder*="Game name"]', 'Test Game for Cleanup');
  
  // Create the game
  await page.click('button:has-text("Create"), button:has-text("Start Game")');
  
  // Wait for game to be created
  await page.waitForSelector('text=Test Game for Cleanup', { timeout: 10000 });
  
  // Now sign out
  await page.click('button:has-text("Sign Out")');
  
  // Wait for the login form to appear again
  await page.waitForSelector('text=Welcome Back', { timeout: 10000 });
  
  // Verify we're back at the login page
  await expect(page.locator('text=Welcome Back')).toBeVisible();
  
  // Login with a different user to check if the game was cleaned up
  await page.fill('input[placeholder="Enter your username..."]', 'test');
  await page.fill('input[placeholder="Enter your password..."]', 'test123');
  
  // Click the sign in button
  await page.click('button:has-text("Sign In")');
  
  // Wait for the lobby to load
  await page.waitForSelector('text=Game Lobby', { timeout: 15000 });
  
  // Wait for the lobby content to load
  await page.waitForSelector('text=Welcome to the ultimate Tic-Tac-Toe experience!', { timeout: 10000 });
  
  // Check that the game created by the previous user is not visible
  // This verifies that the game was properly cleaned up when the user signed out
  const gameElement = page.locator('text=Test Game for Cleanup');
  await expect(gameElement).not.toBeVisible({ timeout: 5000 });
  
  console.log('Sign out cleanup test passed - game was properly removed');
}); 