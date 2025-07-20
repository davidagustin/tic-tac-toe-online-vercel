import { test, expect } from '@playwright/test';

test('Simple Pusher Connection Test', async ({ page }) => {
  console.log('🔌 Testing Pusher connection...');
  
  // Listen to console logs
  page.on('console', msg => {
    console.log('Browser console:', msg.text());
  });
  
  page.on('pageerror', error => {
    console.error('Browser page error:', error);
  });
  
  // Go to the app
  await page.goto('http://localhost:3000');
  
  // Wait for the page to load
  await page.waitForSelector('[data-testid="submit-button"]');
  
  // Register a user
  await page.click('button:has-text("Create New Account")');
  await page.waitForSelector('[data-testid="username-input"]');
  await page.fill('[data-testid="username-input"]', `TestUser${Date.now() % 1000}`);
  await page.fill('[data-testid="password-input"]', 'password123');
  await page.click('[data-testid="submit-button"]');
  
  // Wait for lobby to appear
  await page.waitForSelector('button:has-text("Create Game")', { timeout: 15000 });
  console.log('✅ User registered and lobby loaded');
  
  // Create a game
  await page.click('button:has-text("Create Game")');
  await page.waitForSelector('input[id="gameName"]');
  await page.fill('input[id="gameName"]', 'Pusher Test Game');
  await page.click('button:has-text("Create")');
  
  // Wait for game to load
  try {
    await page.waitForSelector('.grid.grid-cols-3', { timeout: 30000 });
    console.log('✅ Game loaded successfully');
    
    // Check if we can see the game board
    const gameBoard = page.locator('.grid.grid-cols-3');
    await expect(gameBoard).toBeVisible();
    console.log('✅ Game board is visible');
    
    // Check if we can see the Players section (be more specific)
    const playersSection = page.locator('h3:has-text("Players")');
    await expect(playersSection).toBeVisible();
    console.log('✅ Players section is visible');
    
    // Check if we can see the Current Turn section
    const currentTurnSection = page.locator('h3:has-text("Current Turn")');
    await expect(currentTurnSection).toBeVisible();
    console.log('✅ Current Turn section is visible');
    
    // Check if we can see the Game Status section
    const gameStatusSection = page.locator('h3:has-text("Game Status")');
    await expect(gameStatusSection).toBeVisible();
    console.log('✅ Game Status section is visible');
    
    console.log('✅ Pusher connection test passed!');
    
  } catch (error) {
    console.error('❌ Game failed to load:', error);
    
    // Check what's actually on the page
    const pageContent = await page.content();
    console.log('Page content length:', pageContent.length);
    
    // Check for specific elements
    const loadingText = page.locator('text=Loading Game');
    const timeoutText = page.locator('text=Connection timeout');
    const backButton = page.locator('button:has-text("Back to Lobby")');
    
    console.log('Loading Game text visible:', await loadingText.isVisible());
    console.log('Connection timeout visible:', await timeoutText.isVisible());
    console.log('Back to Lobby button visible:', await backButton.isVisible());
    
    throw error;
  }
}); 