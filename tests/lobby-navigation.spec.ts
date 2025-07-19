import { test, expect } from '@playwright/test';

test('Lobby navigation test', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:3000');
  
  // Wait for the login form to be visible
  await page.waitForSelector('text=Welcome Back', { timeout: 10000 });
  
  // Fill in the login form with existing test user
  await page.fill('input[placeholder="Enter your username..."]', 'test');
  await page.fill('input[placeholder="Enter your password..."]', 'test123');
  
  // Click the sign in button
  await page.click('button:has-text("Sign In")');
  
  // Wait for either success message or lobby to appear
  await Promise.race([
    page.waitForSelector('text=Successfully signed in!', { timeout: 5000 }),
    page.waitForSelector('text=Welcome, test!', { timeout: 5000 })
  ]);
  
  // Wait for the lobby to load
  await page.waitForSelector('text=Welcome, test!', { timeout: 10000 });
  
  // Look for lobby content
  const lobbyContent = page.locator('text=Welcome, test!');
  await expect(lobbyContent).toBeVisible();
  
  // Look for sign out button
  const signOutButton = page.locator('button:has-text("Sign Out")');
  await expect(signOutButton).toBeVisible();
  
  // Test sign out functionality
  await signOutButton.click();
  
  // Should be back to login screen
  await page.waitForSelector('text=Welcome Back', { timeout: 5000 });
});

test('Login error handling test', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:3000');
  
  // Wait for the login form to be visible
  await page.waitForSelector('text=Welcome Back', { timeout: 10000 });
  
  // Try to login with invalid credentials
  await page.fill('input[placeholder="Enter your username..."]', 'invaliduser');
  await page.fill('input[placeholder="Enter your password..."]', 'wrongpassword');
  
  // Click the sign in button
  await page.click('button:has-text("Sign In")');
  
  // Should show error message
  await page.waitForSelector('text=Invalid username or password', { timeout: 5000 });
}); 