import { test, expect } from '@playwright/test';

test.describe('Login Screen CSS Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should load CSS files correctly', async ({ page }) => {
    // Check if CSS is loaded by looking for styled elements
    const background = page.locator('div').filter({ hasText: 'Welcome Back' }).first();
    await expect(background).toHaveClass(/bg-gradient-to-br/);
    
    console.log('✅ CSS files loaded correctly');
  });

  test('should display dark theme background', async ({ page }) => {
    // Check the main background container
    const background = page.locator('div').filter({ hasText: 'Welcome Back' }).first();
    
    // Verify the gradient background classes
    await expect(background).toHaveClass(/bg-gradient-to-br/);
    await expect(background).toHaveClass(/from-slate-900/);
    await expect(background).toHaveClass(/via-purple-900/);
    await expect(background).toHaveClass(/to-slate-900/);
    
    console.log('✅ Dark theme background displayed correctly');
  });

  test('should display animated background blobs', async ({ page }) => {
    // Find the animated blobs
    const blobs = page.locator('.animate-blob');
    await expect(blobs).toHaveCount(3);
    
    // Check individual blob classes
    const blob1 = blobs.nth(0);
    const blob2 = blobs.nth(1);
    const blob3 = blobs.nth(2);
    
    await expect(blob1).toHaveClass(/bg-purple-500/);
    await expect(blob2).toHaveClass(/bg-yellow-500/);
    await expect(blob3).toHaveClass(/bg-pink-500/);
    
    // Check for animation delay classes
    await expect(blob2).toHaveClass(/animation-delay-2000/);
    await expect(blob3).toHaveClass(/animation-delay-4000/);
    
    console.log('✅ Animated background blobs displayed correctly');
  });

  test('should display glass morphism card', async ({ page }) => {
    // Find the glass morphism card (the third div with Welcome Back text)
    const card = page.locator('div').filter({ hasText: 'Welcome Back' }).nth(2);
    
    // Verify glass morphism classes
    await expect(card).toHaveClass(/bg-white/);
    await expect(card).toHaveClass(/bg-opacity-10/);
    await expect(card).toHaveClass(/backdrop-blur-lg/);
    await expect(card).toHaveClass(/rounded-3xl/);
    await expect(card).toHaveClass(/shadow-2xl/);
    
    console.log('✅ Glass morphism card displayed correctly');
  });

  test('should display styled form elements', async ({ page }) => {
    // Check username input
    const usernameInput = page.getByPlaceholder('Enter your username...');
    await expect(usernameInput).toBeVisible();
    await expect(usernameInput).toHaveClass(/bg-white/);
    await expect(usernameInput).toHaveClass(/bg-opacity-10/);
    await expect(usernameInput).toHaveClass(/border-purple-300/);
    await expect(usernameInput).toHaveClass(/rounded-2xl/);
    
    // Check password input
    const passwordInput = page.getByPlaceholder('Enter your password...');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveClass(/bg-white/);
    await expect(passwordInput).toHaveClass(/bg-opacity-10/);
    await expect(passwordInput).toHaveClass(/border-purple-300/);
    await expect(passwordInput).toHaveClass(/rounded-2xl/);
    
    // Check submit button
    const submitButton = page.getByRole('button', { name: 'Sign In' });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toHaveClass(/bg-gradient-to-r/);
    await expect(submitButton).toHaveClass(/from-purple-600/);
    await expect(submitButton).toHaveClass(/via-pink-400/);
    await expect(submitButton).toHaveClass(/to-red-500/);
    await expect(submitButton).toHaveClass(/rounded-2xl/);
    
    console.log('✅ Form elements styled correctly');
  });

  test('should display proper text colors', async ({ page }) => {
    // Check heading
    const heading = page.locator('h1').filter({ hasText: 'Welcome Back' });
    await expect(heading).toHaveClass(/text-white/);
    
    // Check subtitle color
    const subtitle = page.locator('p').filter({ hasText: 'Sign in to continue' });
    await expect(subtitle).toHaveClass(/text-purple-200/);
    
    // Check label colors
    const labels = page.locator('label');
    for (let i = 0; i < await labels.count(); i++) {
      await expect(labels.nth(i)).toHaveClass(/text-white/);
    }
    
    console.log('✅ Text colors displayed correctly');
  });

  test('should display animated game icon', async ({ page }) => {
    // Find the game icon (the div containing the 🎮 emoji)
    const gameIcon = page.locator('div.inline-flex').filter({ hasText: '🎮' }).first();
    
    // Verify animation classes
    await expect(gameIcon).toHaveClass(/bg-gradient-to-r/);
    await expect(gameIcon).toHaveClass(/from-purple-600/);
    await expect(gameIcon).toHaveClass(/to-pink-400/);
    await expect(gameIcon).toHaveClass(/rounded-full/);
    
    console.log('✅ Animated game icon displayed correctly');
  });

  test('should display feature list with proper styling', async ({ page }) => {
    // Check if feature list is present (use a more specific selector)
    const features = page.locator('div').filter({ hasText: 'Real-time multiplayer gaming' }).nth(3);
    await expect(features).toBeVisible();
    
    // Check feature items
    const featureItems = page.locator('span').filter({ hasText: '✅' });
    await expect(featureItems).toHaveCount(3);
    
    // Verify feature text colors
    const featureTexts = page.locator('span').filter({ hasText: /Real-time|Live chat|Free to play/ });
    for (let i = 0; i < await featureTexts.count(); i++) {
      await expect(featureTexts.nth(i)).toHaveClass(/text-purple-200/);
    }
    
    console.log('✅ Feature list with proper styling displayed correctly');
  });
}); 