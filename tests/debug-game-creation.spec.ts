import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test('Debug game creation callback', async ({ page }) => {
  // Clear database before test
  console.log('🧹 Clearing database before test...');
  try {
    const response = await fetch('http://localhost:3000/api/clear-db', { method: 'POST' });
    if (response.ok) {
      const result = await response.json();
      console.log('🧹 Database cleared successfully:', result);
    } else {
      console.log('🧹 Database clear failed:', response.status);
    }
  } catch (error) {
    console.log('🧹 Database clear failed:', error);
  }
  
  // Listen for console logs
  page.on('console', msg => {
    console.log('Browser Console:', msg.text());
  });

  await page.goto(BASE_URL);
  await page.waitForSelector('input#username', { timeout: 10000 });
  
  // Register a user
  if (await page.locator('button:has-text("Sign up")').isVisible()) {
    await page.click('button:has-text("Sign up")');
  }
  
  const username = 'debug' + (Date.now() % 10000);
  await page.fill('input#username', username);
  await page.fill('input#password', 'password123');
  await page.click('button[type="submit"]');
  
  // Wait for lobby
  await page.waitForSelector(`text=Welcome, ${username}!`, { timeout: 15000 });
  
  // Create a game
  await page.click('button:has-text("Create Game")');
  await page.fill('input[placeholder*="game name"], input[name="gameName"]', 'Debug Game');
  await page.click('button:has-text("Create Game")');
  
  // Wait a bit to see console logs
  await page.waitForTimeout(5000);
  
  // Check if we're in the game or still in lobby
  const isInGame = await page.locator('text=Your turn!').isVisible();
  const isInLobby = await page.locator('text=Welcome, debuguser!').isVisible();
  
  console.log('Is in game:', isInGame);
  console.log('Is in lobby:', isInLobby);
  
  // Take a screenshot for debugging
  await page.screenshot({ path: 'debug-game-creation.png' });
  
  // Clear database after test
  console.log('🧹 Clearing database after test...');
  try {
    await fetch('http://localhost:3000/api/clear-db', { method: 'POST' });
    console.log('🧹 Database cleared successfully');
  } catch (error) {
    console.log('🧹 Database clear failed:', error);
  }
}); 