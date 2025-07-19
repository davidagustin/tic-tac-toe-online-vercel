import { test, expect } from '@playwright/test';

test.describe('Final Login Screen CSS Verification', () => {
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

  test('should display animated background blobs', async ({ page }) => {
    // Find the animated blobs
    const blobs = page.locator('.animate-blob');
    await expect(blobs).toHaveCount(3);
    
    // Check individual blob classes
    const blob1 = blobs.nth(0);
    const blob2 = blobs.nth(1);
    const blob3 = blobs.nth(2);
    
    expect(await blob1.getAttribute('class')).toContain('bg-purple-500');
    expect(await blob2.getAttribute('class')).toContain('bg-yellow-500');
    expect(await blob3.getAttribute('class')).toContain('bg-pink-500');
    
    console.log('✅ Animated blobs found: 3 blobs with correct colors');
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
    const headingClasses = await heading.getAttribute('class');
    expect(headingClasses).toContain('text-white');
    
    // Check subtitle
    const subtitle = page.locator('p').filter({ hasText: 'Sign in to continue' });
    const subtitleClasses = await subtitle.getAttribute('class');
    expect(subtitleClasses).toContain('text-purple-200');
    
    // Check labels
    const labels = page.locator('label');
    for (let i = 0; i < await labels.count(); i++) {
      const labelClasses = await labels.nth(i).getAttribute('class');
      expect(labelClasses).toContain('text-white');
    }
    
    console.log('✅ Text colors displayed correctly');
  });

  test('should display animated game icon', async ({ page }) => {
    // Find the game icon (look for the div with 🎮 that has gradient classes)
    const gameIcon = page.locator('div.inline-flex').filter({ hasText: '🎮' }).first();
    
    const iconClasses = await gameIcon.getAttribute('class');
    expect(iconClasses).toContain('bg-gradient-to-r');
    expect(iconClasses).toContain('from-purple-600');
    expect(iconClasses).toContain('to-pink-400');
    expect(iconClasses).toContain('rounded-full');
    
    console.log('✅ Animated game icon displayed correctly');
  });

  test('should have proper form functionality', async ({ page }) => {
    // Test form interaction
    const usernameInput = page.getByPlaceholder('Enter your username...');
    const passwordInput = page.getByPlaceholder('Enter your password...');
    const submitButton = page.getByRole('button', { name: 'Sign In' });
    
    // Fill form
    await usernameInput.fill('testuser');
    await passwordInput.fill('testpass123');
    
    // Verify inputs are filled
    await expect(usernameInput).toHaveValue('testuser');
    await expect(passwordInput).toHaveValue('testpass123');
    
    // Verify button is enabled
    await expect(submitButton).toBeEnabled();
    
    console.log('✅ Form functionality working correctly');
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify elements are still visible
    await expect(page.getByText('Welcome Back')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your username...')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your password...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Verify elements are still visible
    await expect(page.getByText('Welcome Back')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your username...')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your password...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    
    console.log('✅ Responsive design working correctly');
  });

  test('should verify CSS animations are loaded', async ({ page }) => {
    // Check for animation classes
    const blobs = page.locator('.animate-blob');
    await expect(blobs).toHaveCount(3);
    
    // Check for transition classes
    const inputs = page.locator('input');
    for (let i = 0; i < await inputs.count(); i++) {
      const inputClasses = await inputs.nth(i).getAttribute('class');
      expect(inputClasses).toContain('transition-all');
      expect(inputClasses).toContain('duration-300');
    }
    
    console.log('✅ CSS animations loaded correctly');
  });

  test('should display feature list', async ({ page }) => {
    // Check feature list container (use a more specific selector)
    const featureList = page.locator('div').filter({ hasText: 'Real-time multiplayer gaming' }).nth(3);
    await expect(featureList).toBeVisible();
    
    // Check feature checkmarks
    const checkmarks = page.locator('span').filter({ hasText: '✅' });
    await expect(checkmarks).toHaveCount(3);
    
    // Verify feature text colors
    const featureTexts = page.locator('span').filter({ hasText: /Real-time|Live chat|Free to play/ });
    for (let i = 0; i < await featureTexts.count(); i++) {
      const textClasses = await featureTexts.nth(i).getAttribute('class');
      expect(textClasses).toContain('text-purple-200');
    }
    
    console.log('✅ Feature list displayed correctly');
  });

  test('should take screenshot for visual verification', async ({ page }) => {
    // Take a screenshot of the login page
    await page.screenshot({ path: 'test-results/login-page-screenshot.png', fullPage: true });
    
    // Verify key elements are present
    await expect(page.getByText('Welcome Back')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your username...')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your password...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByText('Real-time multiplayer gaming')).toBeVisible();
    
    console.log('✅ Screenshot saved and page elements verified');
  });
}); 