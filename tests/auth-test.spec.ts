import { test, expect } from '@playwright/test';

test('Authentication loading state test', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:3000');
  
  // Wait for the login form to be visible
  await page.waitForSelector('text=Welcome Back', { timeout: 10000 });
  
  // Fill in the login form with existing demo user
  await page.fill('input[placeholder="Enter your username..."]', 'demo');
  await page.fill('input[placeholder="Enter your password..."]', 'demo123');
  
  // Click the sign in button
  await page.click('button:has-text("Sign In")');
  
  // Should show loading state
  await page.waitForSelector('text=Processing...', { timeout: 5000 });
  
  // Wait for the lobby to load
  await page.waitForSelector('text=Welcome, demo!', { timeout: 10000 });
});

test('Authentication error message test', async ({ page }) => {
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

test('Authentication success message test', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:3000');
  
  // Wait for the login form to be visible
  await page.waitForSelector('text=Welcome Back', { timeout: 10000 });
  
  // Fill in the login form with existing test user
  await page.fill('input[placeholder="Enter your username..."]', 'test');
  await page.fill('input[placeholder="Enter your password..."]', 'test123');
  
  // Click the sign in button
  await page.click('button:has-text("Sign In")');
  
  // Wait for the lobby to load
  await page.waitForSelector('text=Welcome, test!', { timeout: 10000 });
}); 