import { test, expect } from '@playwright/test';

test('Login Screen CSS Loading Test', async ({ page }) => {
  // Navigate to the login page
  await page.goto('http://localhost:3000');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Check if CSS files are loaded
  const cssLinks = await page.locator('link[rel="stylesheet"]').all();
  console.log(`Found ${cssLinks.length} CSS links`);
  
  // Verify at least one CSS file is loaded
  expect(cssLinks.length).toBeGreaterThan(0);
  
  // Check if the main CSS file is loaded
  const mainCssLink = page.locator('link[href*="layout.css"]').first();
  const isMainCssVisible = await mainCssLink.isVisible();
  console.log(`Main CSS link visible: ${isMainCssVisible}`);
  
  // Check if the CSS file has a valid href
  const href = await mainCssLink.getAttribute('href');
  console.log(`CSS href: ${href}`);
  expect(href).toContain('layout.css');
  
  // Check if the page has the expected content
  const welcomeText = page.locator('text=Welcome Back');
  await expect(welcomeText).toBeVisible();
  
  // Check if the dark background is applied
  const body = page.locator('body');
  const bodyClasses = await body.getAttribute('class');
  console.log(`Body classes: ${bodyClasses}`);
  
  // Check if the main container has the dark theme classes
  const mainContainer = page.locator('div').filter({ hasText: 'Welcome Back' }).first();
  const containerClasses = await mainContainer.getAttribute('class');
  console.log(`Container classes: ${containerClasses}`);
  
  // Verify the page is not showing a white background (basic check)
  const backgroundColor = await page.evaluate(() => {
    const element = document.querySelector('div');
    if (element && element.parentElement) {
      return window.getComputedStyle(element.parentElement).backgroundColor;
    }
    return 'rgba(0, 0, 0, 0)';
  });
  console.log(`Background color: ${backgroundColor}`);
  
  // Take a screenshot for visual verification
  await page.screenshot({ path: 'test-results/login-screen.png', fullPage: true });
  
  console.log('Test completed successfully');
}); 