import { test, expect } from '@playwright/test';

test('Hydration test - check for client-side rendering issues', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:3000');
  
  // Wait for the login form to be visible
  await page.waitForSelector('text=Welcome Back', { timeout: 10000 });
  
  // Check that the form inputs are properly rendered
  const usernameInput = page.locator('input[placeholder="Enter your username..."]');
  const passwordInput = page.locator('input[placeholder="Enter your password..."]');
  
  await expect(usernameInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
  
  // Test that inputs are interactive
  await usernameInput.fill('demo');
  await passwordInput.fill('demo123');
  
  await expect(usernameInput).toHaveValue('demo');
  await expect(passwordInput).toHaveValue('demo123');
  
  // Check that the submit button is properly rendered
  const submitButton = page.locator('button:has-text("Sign In")');
  await expect(submitButton).toBeVisible();
  await expect(submitButton).toBeEnabled();
  
  // Test form submission
  await submitButton.click();
  
  // Wait for the lobby to load
  await page.waitForSelector('text=Welcome, demo!', { timeout: 10000 });
  
  // If we get to the lobby, check that it's properly rendered
  const lobbyContent = page.locator('text=Welcome, demo!');
  if (await lobbyContent.count() > 0) {
    await expect(lobbyContent).toBeVisible();
  }
}); 