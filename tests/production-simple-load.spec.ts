import { test, expect } from '@playwright/test';

test('Check if production app loads', async ({ page }) => {
  console.log('🔍 Checking if production app loads...');
  
  try {
    // Navigate to production
    await page.goto('https://tic-tac-toe-online-vercel.vercel.app', { 
      waitUntil: 'domcontentloaded',
      timeout: 20000 
    });
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Check if page title is correct
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check if there's any content on the page
    const bodyText = await page.textContent('body');
    console.log('Body text preview:', bodyText?.substring(0, 200));
    
    // Check if there are any buttons or forms
    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input').count();
    const forms = await page.locator('form').count();
    
    console.log('Page elements found:');
    console.log('- Buttons:', buttons);
    console.log('- Inputs:', inputs);
    console.log('- Forms:', forms);
    
    // Take a screenshot
    await page.screenshot({ path: 'production-simple-load.png', fullPage: true });
    console.log('📸 Screenshot saved as production-simple-load.png');
    
    // Basic assertions
    expect(title).toContain('Tic-Tac-Toe');
    expect(buttons).toBeGreaterThan(0);
    
    console.log('✅ Production app loads successfully');
    
  } catch (error) {
    console.error('❌ Production app load check failed:', error);
    await page.screenshot({ path: 'production-simple-load-error.png', fullPage: true });
    throw error;
  }
}); 