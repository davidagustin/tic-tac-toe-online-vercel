import { test, expect } from '@playwright/test';

test.describe('UI Move Test', () => {
  test('Test UI move functionality with detailed debugging', async ({ page }) => {
    console.log('🧪 Starting UI move test with detailed debugging...');
    
    // Clean up before test starts
    try {
      await fetch('http://localhost:3000/api/clear-db', { method: 'POST' });
      console.log('🧹 Cleaned up database before test');
    } catch (error) {
      console.log('⚠️ Could not clean database before test:', error);
    }
    
    // Register and create game
    await page.goto('http://localhost:3000');
    await page.waitForSelector('[data-testid="submit-button"]');
    await page.click('button:has-text("Create New Account")');
    await page.waitForSelector('[data-testid="username-input"]');
    await page.fill('[data-testid="username-input"]', `TestPlayer${Date.now() % 1000}`);
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="submit-button"]');
    
    // Wait for lobby to appear
    await page.waitForSelector('button:has-text("Create Game")', { timeout: 15000 });
    console.log('✅ Successfully in lobby');
    
    // Create game
    await page.click('button:has-text("Create Game")');
    await page.waitForSelector('input[id="gameName"]');
    await page.fill('input[id="gameName"]', 'UI Move Test Game');
    await page.click('button:has-text("Create")');
    
    // Wait for game to load
    await page.waitForSelector('.grid.grid-cols-3', { timeout: 30000 });
    console.log('✅ Game created and loaded');
    
    // Wait for game to be in playing state (this should happen automatically for single player)
    console.log('🎮 Waiting for game to be in playing state...');
    
    // Check the current game status
    const gameStatusElement = page.locator('h3:has-text("Game Status")').locator('..').locator('p').first();
    const gameStatus = await gameStatusElement.textContent();
    console.log('🔍 Current game status:', gameStatus);
    
    // Check if "Your turn!" is visible
    const yourTurnElement = page.locator('text=Your turn!');
    const isYourTurnVisible = await yourTurnElement.isVisible();
    console.log('🔍 "Your turn!" visible:', isYourTurnVisible);
    
    // If game is still waiting, let's manually trigger it to playing state via API
    if (gameStatus === 'waiting') {
      console.log('⚠️ Game is still waiting, manually adding a second player via API...');
      
      // Get the current game ID from the URL or page content
      const gameId = await page.evaluate(() => {
        // Try to get game ID from localStorage or sessionStorage
        const gameData = localStorage.getItem('currentGame') || sessionStorage.getItem('currentGame');
        if (gameData) {
          try {
            return JSON.parse(gameData).gameId;
          } catch (e) {
            return null;
          }
        }
        return null;
      });
      
      if (gameId) {
        console.log('🔍 Found game ID:', gameId);
        
        // Add a second player via API
        const joinResponse = await fetch(`http://localhost:3000/api/game/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: gameId,
            userName: 'TestPlayer2'
          })
        });
        
        if (joinResponse.ok) {
          console.log('✅ Second player added via API');
          
          // Wait for the UI to update
          await page.waitForTimeout(3000);
          
          // Check status again
          const newGameStatus = await gameStatusElement.textContent();
          console.log('🔍 Game status after adding player:', newGameStatus);
          
          const newYourTurnVisible = await yourTurnElement.isVisible();
          console.log('🔍 "Your turn!" visible after adding player:', newYourTurnVisible);
        } else {
          console.log('❌ Failed to add second player via API');
        }
      } else {
        console.log('❌ Could not find game ID');
      }
    }
    
    // Now try to make a move
    console.log('🎮 Attempting to make a move...');
    const cell0 = page.locator('.grid.grid-cols-3 button').nth(0);
    
    // Check if the cell is clickable
    const isCell0Enabled = await cell0.isEnabled();
    console.log('🔍 Cell 0 enabled:', isCell0Enabled);
    
    if (!isCell0Enabled) {
      console.log('❌ Cell 0 is not enabled - cannot make move');
      
      // Check what's preventing the cell from being enabled
      const isGameEnded = await page.locator('text=Game ended').isVisible();
      const isWaiting = await page.locator('text=Waiting for players').isVisible();
      const isConnected = await page.locator('text=Connected').isVisible();
      
      console.log('🔍 Game ended visible:', isGameEnded);
      console.log('🔍 Waiting for players visible:', isWaiting);
      console.log('🔍 Connected visible:', isConnected);
      
      throw new Error('Cell is not enabled for clicking');
    }
    
    // Click the cell
    await cell0.click();
    console.log('✅ Cell 0 clicked');
    
    // Wait a bit for the move to be processed
    await page.waitForTimeout(3000);
    
    // Check what's actually in the cell after clicking
    const cell0Text = await cell0.textContent();
    console.log('🔍 Cell 0 text after click:', cell0Text);
    
    // Verify the move was made
    if (cell0Text && cell0Text.trim() !== '') {
      console.log('✅ Move was successful - cell contains:', cell0Text);
    } else {
      console.log('❌ Move failed - cell is empty');
      
      // Check for any error messages
      const errorMessages = page.locator('text=Error, text=Failed, text=Something went wrong');
      const hasError = await errorMessages.isVisible();
      console.log('🔍 Error message visible:', hasError);
      
      if (hasError) {
        const errorText = await errorMessages.textContent();
        console.log('🔍 Error text:', errorText);
      }
      
      throw new Error('Move was not processed - cell is empty');
    }
    
    // Check if turn switched
    const yourTurnTextAfter = page.locator('text=Your turn!');
    const isStillMyTurn = await yourTurnTextAfter.isVisible();
    console.log('🔍 Still my turn after move:', isStillMyTurn);
    
    if (isStillMyTurn) {
      console.log('⚠️ Turn did not switch after move');
    } else {
      console.log('✅ Turn switched after move');
    }
    
    console.log('🏁 UI move test completed successfully!');
  });
}); 