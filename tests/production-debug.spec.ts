import { test, expect } from '@playwright/test';

test('Production site debug test', async ({ page }) => {
  // Navigate to the production app
  await page.goto('https://tic-tac-toe-online-vercel.vercel.app');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Take a screenshot to see what's on the page
  await page.screenshot({ path: 'production-debug.png', fullPage: true });
  
  // Get the page title
  const title = await page.title();
  console.log('Page title:', title);
  
  // Get all text content on the page
  const pageText = await page.textContent('body');
  console.log('Page text (first 500 chars):', pageText?.substring(0, 500));
  
  // Check if there are any input fields
  const inputs = await page.locator('input').count();
  console.log('Number of input fields:', inputs);
  
  // List all input placeholders
  const inputElements = await page.locator('input').all();
  for (let i = 0; i < inputElements.length; i++) {
    const placeholder = await inputElements[i].getAttribute('placeholder');
    console.log(`Input ${i} placeholder:`, placeholder);
  }
  
  // Check if there are any buttons
  const buttons = await page.locator('button').count();
  console.log('Number of buttons:', buttons);
  
  // List all button text
  const buttonElements = await page.locator('button').all();
  for (let i = 0; i < buttonElements.length; i++) {
    const text = await buttonElements[i].textContent();
    console.log(`Button ${i} text:`, text);
  }
  
  console.log('Production debug test completed');
}); 