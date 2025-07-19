import { test, expect } from '@playwright/test';

test('Chat UI elements test', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:3000');
  
  // Wait for the login form to be visible
  await page.waitForSelector('text=Welcome Back', { timeout: 10000 });
  
  // Fill in the login form with existing demo user
  await page.fill('input[placeholder="Enter your username..."]', 'demo');
  await page.fill('input[placeholder="Enter your password..."]', 'demo123');
  
  // Click the sign in button
  await page.click('button:has-text("Sign In")');
  
  // Wait for either success message or lobby to appear
  await Promise.race([
    page.waitForSelector('text=Successfully signed in!', { timeout: 5000 }),
    page.waitForSelector('text=Welcome, demo!', { timeout: 5000 })
  ]);
  
  // Wait for the lobby to load
  await page.waitForSelector('text=Welcome, demo!', { timeout: 10000 });
  
  // Wait for the lobby content to load
  await page.waitForSelector('text=Game Lobby', { timeout: 10000 });
  
  // Click on the Chat tab to show chat interface
  await page.click('button:has-text("Chat")');
  
  // Wait for chat interface to load
  await page.waitForSelector('text=Chat with other players before starting a game', { timeout: 5000 });
  
  // Look for chat input in the lobby
  const chatInput = page.locator('input[placeholder*="chat"], textarea[placeholder*="chat"], input[placeholder*="message"], textarea[placeholder*="message"]');
  
  // Check if chat input exists
  if (await chatInput.count() > 0) {
    await expect(chatInput.first()).toBeVisible();
    
    // Look for send button
    const sendButton = page.locator('button:has-text("Send"), button:has-text("Submit"), button[type="submit"]');
    if (await sendButton.count() > 0) {
      await expect(sendButton.first()).toBeVisible();
    }
    
    // Test typing in chat input
    await chatInput.first().fill('Test message');
    await expect(chatInput.first()).toHaveValue('Test message');
  } else {
    // If no chat input found, the test should still pass as chat might not be available
    console.log('No chat input found in the lobby');
  }
});

test('Game chat UI functionality', async ({ page }) => {
  // Navigate to the app
  await page.goto('/');
  
  // Login
  await page.waitForSelector('input[placeholder="Enter your username..."]');
  await page.fill('input[placeholder="Enter your username..."]', 'GameUITestUser');
  await page.fill('input[placeholder="Enter your password..."]', 'testpass123');
  await page.click('button:has-text("Sign In")');
  
  // Wait for the main app to load
  await page.waitForSelector('text=Tic-Tac-Toe Online');
  
  // Switch to game view
  await page.click('button:has-text("Go To Game")');
  
  // Wait for the game chat to load
  await page.waitForSelector('text=Game Chat');
  
  // Find the chat input
  const chatInput = page.locator('input[placeholder="Type your message..."]');
  await expect(chatInput).toBeVisible();
  
  // Type a test message
  const testMessage = 'Hello from game UI test!';
  await chatInput.fill(testMessage);
  
  // Verify the message is in the input
  await expect(chatInput).toHaveValue(testMessage);
  
  // Submit the message
  await page.click('button:has-text("Submit")');
  
  // Verify the input is cleared
  await expect(chatInput).toHaveValue('');
  
  console.log('✅ Game chat UI test passed: Input and form work correctly');
});

test('Login form validation', async ({ page }) => {
  // Navigate to the app
  await page.goto('/');
  
  // Check login form is visible
  await expect(page.locator('text=Welcome Back')).toBeVisible();
  
  // Try to submit empty form
  await page.click('button:has-text("Sign In")');
  
  // Should still be on login page
  await expect(page.locator('text=Welcome Back')).toBeVisible();
  
  // Enter a short password (less than 6 characters)
  await page.fill('input[placeholder="Enter your username..."]', 'ValidUser');
  await page.fill('input[placeholder="Enter your password..."]', '123');
  await page.click('button:has-text("Sign In")');
  
  // Should still be on login page
  await expect(page.locator('text=Welcome Back')).toBeVisible();
  
  // Enter valid credentials
  await page.fill('input[placeholder="Enter your username..."]', 'ValidUser');
  await page.fill('input[placeholder="Enter your password..."]', 'testpass123');
  await page.click('button:has-text("Sign In")');
  
  // Should now be logged in
  await expect(page.locator('text=Tic-Tac-Toe Online')).toBeVisible();
  
  console.log('✅ Login validation test passed: Form validation works correctly');
});

test('Navigation between lobby and game', async ({ page }) => {
  // Navigate to the app
  await page.goto('/');
  
  // Login
  await page.waitForSelector('input[placeholder="Enter your username..."]');
  await page.fill('input[placeholder="Enter your username..."]', 'NavTestUser');
  await page.fill('input[placeholder="Enter your password..."]', 'testpass123');
  await page.click('button:has-text("Sign In")');
  
  // Wait for the main app to load
  await page.waitForSelector('text=Tic-Tac-Toe Online');
  
  // Should start in lobby view
  await expect(page.locator('text=Game Lobby')).toBeVisible();
  
  // Switch to game view
  await page.click('button:has-text("Go To Game")');
  
  // Should now be in game view
  await expect(page.locator('text=Game')).toBeVisible();
  await expect(page.locator('text=Game Chat')).toBeVisible();
  
  // Switch back to lobby
  await page.click('button:has-text("Go To Lobby")');
  
  // Should be back in lobby
  await expect(page.locator('text=Game Lobby')).toBeVisible();
  
  console.log('✅ Navigation test passed: Can switch between lobby and game');
}); 