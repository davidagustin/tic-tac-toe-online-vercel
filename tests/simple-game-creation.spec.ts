import { test, expect } from '@playwright/test';

test('Simple game creation test', async ({ page }) => {
  // Clear database first
  console.log('🧹 Clearing database before test...');
  const clearResponse = await page.request.post('http://localhost:3000/api/clear-db');
  const clearData = await clearResponse.json();
  console.log('🧹 Database cleared successfully:', clearData);

  // Register a user
  const username = 'testuser' + Date.now();
  await page.goto('http://localhost:3000');
  
  // Wait for page to load and add debugging
  await page.waitForLoadState('networkidle');
  console.log('✅ Page loaded');
  
  // Check page content
  const pageContent = await page.content();
  console.log('📄 Page content length:', pageContent.length);
  console.log('📄 Page title:', await page.title());
  
  // Check if username input exists
  const usernameInput = await page.locator('input[placeholder="Enter your username..."]');
  const inputExists = await usernameInput.count();
  console.log('🔍 Username input count:', inputExists);
  
  if (inputExists === 0) {
    console.log('❌ Username input not found, saving page content for analysis');
    const fs = require('fs');
    fs.writeFileSync('debug-page-content.html', pageContent);
    await page.screenshot({ path: 'debug-page-screenshot.png' });
    throw new Error('Username input not found on page');
  }
  
  // Click "Sign up" to switch to register mode
  await page.click('button:has-text("Sign up")');
  
  await page.fill('input[placeholder="Enter your username..."]', username);
  await page.fill('input[placeholder="Enter your password..."]', 'password123');
  await page.click('button:has-text("Sign Up")');
  
  // Wait for lobby
  await page.waitForSelector('text=Welcome to Tic-Tac-Toe Online!', { timeout: 10000 });
  console.log('✅ User registered and lobby loaded');

  // Create a game
  await page.click('button:has-text("Create Game")');
  console.log('✅ Create Game button clicked');

  // Wait for game to be created and check if we're in the game
  try {
    await page.waitForSelector('text=Your turn!', { timeout: 10000 });
    console.log('✅ Game created successfully - Player sees "Your turn!"');
  } catch (error) {
    console.log('❌ Player does not see "Your turn!", checking for "Waiting for players..."');
    try {
      await page.waitForSelector('text=Waiting for players...', { timeout: 5000 });
      console.log('✅ Game created successfully - Player sees "Waiting for players..."');
    } catch (error2) {
      console.log('❌ Player does not see either message');
      
      // Save DOM and screenshot for analysis
      const content = await page.content();
      const fs = require('fs');
      fs.writeFileSync('simple-test-dom.html', content);
      await page.screenshot({ path: 'simple-test-screenshot.png' });
      console.log('📄 DOM and screenshot saved for analysis');
      
      throw new Error('Game creation failed - frontend not updating properly');
    }
  }
}); 