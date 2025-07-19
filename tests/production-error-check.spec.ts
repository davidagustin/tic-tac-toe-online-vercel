import { test, expect } from '@playwright/test';

test('Check for JavaScript errors in production', async ({ page }) => {
  console.log('🔍 Checking for JavaScript errors in production...');
  
  const errors: string[] = [];
  
  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log('❌ Console error:', msg.text());
    }
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log('❌ Page error:', error.message);
  });
  
  try {
    // Navigate to production
    await page.goto('https://tic-tac-toe-online-vercel.vercel.app', { 
      waitUntil: 'domcontentloaded',
      timeout: 20000 
    });
    
    // Wait for page to load
    await page.waitForTimeout(5000);
    
    // Take a screenshot
    await page.screenshot({ path: 'production-error-check.png', fullPage: true });
    console.log('📸 Screenshot saved as production-error-check.png');
    
    // Check for error messages on the page
    const errorElements = await page.locator('text=error, text=Error, text=exception, text=Exception').allTextContents();
    if (errorElements.length > 0) {
      console.log('❌ Error elements found on page:', errorElements);
    }
    
    // Check for the specific "Application error" message
    const appError = page.locator('text=Application error');
    if (await appError.isVisible({ timeout: 3000 })) {
      console.log('❌ Found "Application error" message on page');
    }
    
    // Get console logs
    const consoleMessages = await page.evaluate(() => {
      return (window as any).console?.logs || [];
    });
    
    console.log('Console messages:', consoleMessages);
    
    // Check if there are any errors
    if (errors.length > 0) {
      console.log('❌ Found JavaScript errors:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
      throw new Error(`Found ${errors.length} JavaScript errors`);
    } else {
      console.log('✅ No JavaScript errors found');
    }
    
    console.log('✅ Error check completed');
    
  } catch (error) {
    console.error('❌ Error check failed:', error);
    await page.screenshot({ path: 'error-check-failed.png', fullPage: true });
    throw error;
  }
}); 