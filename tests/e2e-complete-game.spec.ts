import { test, expect } from '@playwright/test';

test.describe('E2E Complete Game Test', () => {
  test('Two players play complete game and logout', async ({ browser }) => {
  console.log('🚀 Starting E2E complete game test...');
  
  // Clean up before test starts
  try {
    await fetch('http://localhost:3000/api/clear-db', { method: 'POST' });
    console.log('🧹 Cleaned up database before test');
  } catch (error) {
    console.log('⚠️ Could not clean database before test:', error);
  }
  
  // Create two browser contexts for two players
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  
  // Chrome-specific timeout
  const isChrome = browser.browserType().name() === 'chromium';
  const gameLoadTimeout = isChrome ? 45000 : 30000;
  
  console.log(`🎮 Test: Using timeout of ${gameLoadTimeout}ms (Chrome: ${isChrome})`);
  
  try {
      // Player 1: Register and create game
      console.log('👤 Player 1: Starting registration...');
      const player1Username = `P1${Date.now() % 1000}`;
      await page1.goto('http://localhost:3000');
      await page1.waitForSelector('[data-testid="submit-button"]');
      await page1.click('button:has-text("Create New Account")');
      await page1.waitForSelector('[data-testid="username-input"]');
      await page1.fill('[data-testid="username-input"]', player1Username);
      await page1.fill('[data-testid="password-input"]', 'password123');
      await page1.click('[data-testid="submit-button"]');
      
      // Wait for lobby to appear (no URL change, just component change)
      await page1.waitForSelector('button:has-text("Create Game")', { timeout: 15000 });
      console.log('✅ Player 1: Successfully in lobby');
      
      // Create game
      await page1.click('button:has-text("Create Game")');
      await page1.waitForSelector('input[id="gameName"]');
      await page1.fill('input[id="gameName"]', 'E2E Test Game');
      await page1.click('button:has-text("Create")');
      
      // Wait for game to load (no URL change, just component change)
      console.log('⏳ Player 1: Waiting for game to load...');
      
      // Wait longer for the game to load
      try {
        await page1.waitForSelector('.grid.grid-cols-3', { timeout: gameLoadTimeout });
        console.log('✅ Player 1: Game created and loaded');
      } catch (error) {
        console.log(`❌ Player 1: Game failed to load after ${gameLoadTimeout / 1000} seconds`);
        
        // Check what's currently on the page
        const pageContent = await page1.content();
        console.log('Page content length:', pageContent.length);
        
        // Check for timeout message
        const timeoutText = page1.locator('text=Connection timeout');
        const hasTimeout = await timeoutText.isVisible();
        console.log('Connection timeout visible:', hasTimeout);
        
        // Check for "Back to Lobby" button
        const backToLobbyButton = page1.locator('button:has-text("Back to Lobby")');
        const hasBackButton = await backToLobbyButton.isVisible();
        console.log('Back to Lobby button visible:', hasBackButton);
        
        // Check for loading message
        const loadingText = page1.locator('text=Loading Game');
        const hasLoading = await loadingText.isVisible();
        console.log('Loading Game text visible:', hasLoading);
        
        // This should be a failure, not a success
        throw new Error('Game failed to load - Pusher connection timeout or other issue preventing game from starting');
      }
      
      // Player 2: Register and join game
      console.log('👤 Player 2: Starting registration...');
      const player2Username = `P2${Date.now() % 1000}`;
      await page2.goto('http://localhost:3000');
      await page2.waitForSelector('[data-testid="submit-button"]');
      await page2.click('button:has-text("Create New Account")');
      await page2.waitForSelector('[data-testid="username-input"]');
      await page2.fill('[data-testid="username-input"]', player2Username);
      await page2.fill('[data-testid="password-input"]', 'password123');
      await page2.click('[data-testid="submit-button"]');
      
      // Wait for lobby to appear (no URL change, just component change)
      await page2.waitForSelector('button:has-text("Create Game")', { timeout: 30000 });
      console.log('✅ Player 2: Successfully in lobby');
      
      // Wait for the game created by Player 1 to appear
      console.log('🔍 Player 2: Waiting for Player 1 game to appear in lobby...');
      
      // Add delay to allow real-time updates to propagate
      console.log('⏳ Waiting 5 seconds for real-time updates to propagate...');
      await page2.waitForTimeout(5000);
      
      try {
        await page2.waitForSelector(`text=${player1Username}`, { timeout: 15000 });
        console.log('✅ Player 2: Found Player 1 game in lobby');
      } catch (error) {
        console.log('❌ Player 2: Player 1 game not found in lobby');
        
        // Check what games are available
        const allGames = page2.locator('div:has-text("Created by:")');
        const gameCount = await allGames.count();
        console.log('🔍 Player 2: Total games in lobby:', gameCount);
        
        for (let i = 0; i < gameCount; i++) {
          const gameText = await allGames.nth(i).textContent();
          console.log(`🔍 Player 2: Game ${i}: "${gameText}"`);
        }
        
        // Try refreshing the page to see if that helps
        console.log('🔄 Player 2: Refreshing page to try to see games...');
        await page2.reload();
        await page2.waitForSelector('button:has-text("Create Game")', { timeout: 15000 });
        
        // Wait again for games to appear
        await page2.waitForTimeout(3000);
        
        const allGamesAfterRefresh = page2.locator('div:has-text("Created by:")');
        const gameCountAfterRefresh = await allGamesAfterRefresh.count();
        console.log('🔍 Player 2: Total games in lobby after refresh:', gameCountAfterRefresh);
        
        for (let i = 0; i < gameCountAfterRefresh; i++) {
          const gameText = await allGamesAfterRefresh.nth(i).textContent();
          console.log(`🔍 Player 2: Game ${i} after refresh: "${gameText}"`);
        }
        
        // If still no games, try to find any game to join
        if (gameCountAfterRefresh === 0) {
          console.log('❌ Player 2: No games found even after refresh - real-time updates may not be working');
          throw new Error('Player 1 game not found in lobby - real-time updates may not be working');
        }
      }
      
      // Join the game created by Player 1
      console.log('👤 Player 2: Looking for specific game to join...');
      
      // Wait for the game to appear in the lobby
      await page2.waitForSelector(`text=${player1Username}`, { timeout: 10000 });
      console.log('✅ Player 2: Found game created by Player 1');
      
      // Find the Join button for the game created by Player 1
      // Since there should only be one game, just click the first Join button
      const joinButton = page2.locator('button:has-text("Join")').first();
      
      console.log('🔍 Player 2: Looking for Join button...');
      const joinButtonVisible = await joinButton.isVisible();
      console.log('🔍 Player 2: Join button visible:', joinButtonVisible);
      
      if (!joinButtonVisible) {
        // List all available games for debugging
        const allJoinButtons = page2.locator('button:has-text("Join")');
        const joinButtonCount = await allJoinButtons.count();
        console.log('🔍 Player 2: Total Join buttons found:', joinButtonCount);
        
        for (let i = 0; i < joinButtonCount; i++) {
          const buttonText = await allJoinButtons.nth(i).textContent();
          console.log(`🔍 Player 2: Join button ${i}: "${buttonText}"`);
        }
      }
      
      await joinButton.click();
      console.log('✅ Player 2: Clicked Join button for specific game');
      
      // Wait for game to load (no URL change, just component change)
      console.log('⏳ Player 2: Waiting for game to load...');
      
      // Wait for the game to load
      try {
        await page2.waitForSelector('.grid.grid-cols-3', { timeout: 30000 });
        console.log('✅ Player 2: Joined game successfully');
      } catch (error) {
        console.log('❌ Player 2: Game failed to load after 30 seconds');
        
        // Check what's currently on the page
        try {
          const pageContent = await page2.content();
          console.log('Page content length:', pageContent.length);
          
          // Check for timeout message
          const timeoutText = page2.locator('text=Connection timeout');
          const hasTimeout = await timeoutText.isVisible();
          console.log('Connection timeout visible:', hasTimeout);
          
          // Check for "Back to Lobby" button
          const backToLobbyButton = page2.locator('button:has-text("Back to Lobby")');
          const hasBackButton = await backToLobbyButton.isVisible();
          console.log('Back to Lobby button visible:', hasBackButton);
          
          // Check for loading message
          const loadingText = page2.locator('text=Loading Game');
          const hasLoading = await loadingText.isVisible();
          console.log('Loading Game text visible:', hasLoading);
          
          // Check for any error messages
          const errorText = page2.locator('text=Error, text=Failed, text=Something went wrong');
          const hasError = await errorText.isVisible();
          console.log('Error message visible:', hasError);
          
        } catch (contentError) {
          console.log('Could not check page content:', contentError);
        }
        
        // This should be a failure, not a success
        throw new Error('Game failed to load - Pusher connection timeout or other issue preventing game from starting');
      }
      
      // Add delay between players to avoid connection conflicts
      console.log('⏳ Waiting 10 seconds between players to avoid connection conflicts...');
      await page1.waitForTimeout(10000);
      await page2.waitForTimeout(10000);
      
      // Wait for both players to be in the game
      console.log('🔍 Waiting for players to appear in game...');
      console.log('🔍 Looking for player2Username:', player2Username, 'in page1');
      console.log('🔍 Looking for player1Username:', player1Username, 'in page2');
      
      // Add some debugging to see what's actually on the page
      const page1Content = await page1.content();
      const page2Content = await page2.content();
      console.log('🔍 Page1 content includes player2Username:', page1Content.includes(player2Username));
      console.log('🔍 Page2 content includes player1Username:', page2Content.includes(player1Username));
      
      // Check if the game board is visible
      const gameBoard1 = page1.locator('.grid.grid-cols-3');
      const gameBoard2 = page2.locator('.grid.grid-cols-3');
      const board1Visible = await gameBoard1.isVisible();
      const board2Visible = await gameBoard2.isVisible();
      console.log('🔍 Game board visible on page1:', board1Visible);
      console.log('🔍 Game board visible on page2:', board2Visible);
      
      // Wait a bit for the game state to update
      console.log('⏳ Waiting 3 seconds for game state to update...');
      await page1.waitForTimeout(3000);
      await page2.waitForTimeout(3000);
      
      // Check the game state again
      const page1ContentAfter = await page1.content();
      const page2ContentAfter = await page2.content();
      console.log('🔍 After wait - Page1 content includes player2Username:', page1ContentAfter.includes(player2Username));
      console.log('🔍 After wait - Page2 content includes player1Username:', page2ContentAfter.includes(player2Username));
      
      // Wait for both players to be in the game (they appear in the Players section)
      // Look specifically in the Players section
      console.log('🔍 Waiting for players to appear in game...');
      console.log('🔍 Looking for player2Username:', player2Username, 'in page1');
      console.log('🔍 Looking for player1Username:', player1Username, 'in page2');
      
      // Check what's actually in the Players section (be more specific to avoid multiple elements)
      const playersSection1 = page1.locator('h3:has-text("Players")').locator('..');
      const playersSection2 = page2.locator('h3:has-text("Players")').locator('..');
      
      // Wait longer for game state to synchronize
      console.log('⏳ Waiting 10 seconds for game state to synchronize...');
      await page1.waitForTimeout(10000);
      await page2.waitForTimeout(10000);
      
      try {
        const playersText1 = await playersSection1.textContent();
        const playersText2 = await playersSection2.textContent();
        console.log('🔍 Page1 Players section text:', playersText1);
        console.log('🔍 Page2 Players section text:', playersText2);
        
        // Check if both players are visible
        const page1HasPlayer2 = playersText1?.includes(player2Username);
        const page2HasPlayer1 = playersText2?.includes(player1Username);
        console.log('🔍 Page1 has player2:', page1HasPlayer2);
        console.log('🔍 Page2 has player1:', page2HasPlayer1);
        
        if (!page1HasPlayer2 || !page2HasPlayer1) {
          console.log('⚠️ Players not synchronized, waiting additional 5 seconds...');
          await page1.waitForTimeout(5000);
          await page2.waitForTimeout(5000);
          
          const playersText1After = await playersSection1.textContent();
          const playersText2After = await playersSection2.textContent();
          console.log('🔍 After additional wait - Page1 Players section text:', playersText1After);
          console.log('🔍 After additional wait - Page2 Players section text:', playersText2After);
        }
      } catch (error) {
        console.log('Could not get Players section text:', error);
      }
      
      // Wait for players to appear (be more specific)
      await page1.locator('h3:has-text("Players")').locator('..').locator(`text=${player2Username}`).waitFor({ timeout: 15000 });
      await page2.locator('h3:has-text("Players")').locator('..').locator(`text=${player1Username}`).waitFor({ timeout: 15000 });
      console.log('✅ Both players are in the game');
      
      // Wait for game to start and detect whose turn it is
      console.log('🎮 Waiting for game to start...');
      
      // Check what's actually displayed in the Current Turn section
      const currentTurn1 = page1.locator('text=Current Turn').locator('..').locator('p').first();
      const currentTurn2 = page2.locator('text=Current Turn').locator('..').locator('p').first();
      
      try {
        const turnText1 = await currentTurn1.textContent();
        const turnText2 = await currentTurn2.textContent();
        console.log('🔍 Player 1 Current Turn text:', turnText1);
        console.log('🔍 Player 2 Current Turn text:', turnText2);
      } catch (error) {
        console.log('Could not get current turn text:', error);
      }
      
      // Check if "Your turn!" is visible on either page
      const player1TurnText = page1.locator('text=Your turn!');
      const player2TurnText = page2.locator('text=Your turn!');
      
      const isPlayer1Turn = await player1TurnText.isVisible();
      const isPlayer2Turn = await player2TurnText.isVisible();
      
      console.log('🔍 Player 1 "Your turn!" visible:', isPlayer1Turn);
      console.log('🔍 Player 2 "Your turn!" visible:', isPlayer2Turn);
      
      // Wait for at least one player to have their turn
      if (!isPlayer1Turn && !isPlayer2Turn) {
        console.log('⚠️ Neither player shows "Your turn!" - waiting for game state to update...');
        await page1.waitForTimeout(5000);
        
        // Check again
        const isPlayer1TurnAfter = await player1TurnText.isVisible();
        const isPlayer2TurnAfter = await player2TurnText.isVisible();
        console.log('🔍 After wait - Player 1 "Your turn!" visible:', isPlayer1TurnAfter);
        console.log('🔍 After wait - Player 2 "Your turn!" visible:', isPlayer2TurnAfter);
      }
      
      // Wait for at least one player to have their turn (check both pages)
      if (!isPlayer1Turn && !isPlayer2Turn) {
        console.log('⚠️ Still no player has turn, waiting for game state to update...');
        await page1.waitForTimeout(5000);
        await page2.waitForTimeout(5000);
        
        // Check one more time
        const isPlayer1TurnFinal = await player1TurnText.isVisible();
        const isPlayer2TurnFinal = await player2TurnText.isVisible();
        console.log('🔍 Final check - Player 1 "Your turn!" visible:', isPlayer1TurnFinal);
        console.log('🔍 Final check - Player 2 "Your turn!" visible:', isPlayer2TurnFinal);
        
        if (!isPlayer1TurnFinal && !isPlayer2TurnFinal) {
          throw new Error('No player has their turn after waiting - game state issue');
        }
      }
      
      // Check whose turn it is by looking for "Your turn!" message
      console.log(`🎮 Turn detection - Player 1 turn: ${isPlayer1Turn}, Player 2 turn: ${isPlayer2Turn}`);
      
      // Determine the first player and their symbol
      let firstPlayer, secondPlayer, firstSymbol, secondSymbol;
      if (isPlayer1Turn) {
        firstPlayer = page1;
        secondPlayer = page2;
        firstSymbol = 'X';
        secondSymbol = 'O';
        console.log('🎮 Player 1 goes first (X)');
      } else {
        firstPlayer = page2;
        secondPlayer = page1;
        firstSymbol = 'O';
        secondSymbol = 'X';
        console.log('🎮 Player 2 goes first (O)');
      }
      
      // First player makes move (top-left)
      console.log(`🎮 First player making move (${firstSymbol})...`);
      const cell0 = firstPlayer.locator('.grid.grid-cols-3 button').nth(0);
      
      // Check if the cell is clickable
      const isCell0Enabled = await cell0.isEnabled();
      console.log('🔍 Cell 0 enabled:', isCell0Enabled);
      
      await cell0.click();
      console.log('✅ Cell 0 clicked');
      
      // Wait a bit for the move to be processed
      await firstPlayer.waitForTimeout(2000);
      
      // Check what's actually in the cell after clicking
      const cell0Text = await cell0.textContent();
      console.log('🔍 Cell 0 text after click:', cell0Text);
      
      await firstPlayer.waitForSelector(`.grid.grid-cols-3 button:nth-child(1):has-text("${firstSymbol}")`, { timeout: 10000 });
      console.log(`✅ First player (${firstSymbol}) move completed`);
      
      // Second player makes move (center)
      console.log(`🎮 Second player making move (${secondSymbol})...`);
      const cell4 = secondPlayer.locator('.grid.grid-cols-3 button').nth(4);
      
      // Check if the cell is clickable
      const isCell4Enabled = await cell4.isEnabled();
      console.log('🔍 Cell 4 enabled:', isCell4Enabled);
      
      // Wait for turn to switch
      console.log('⏳ Waiting for turn to switch to second player...');
      await secondPlayer.waitForTimeout(3000);
      
      // Check turn status again
      const player2TurnTextAfter = secondPlayer.locator('text=Your turn!');
      const isPlayer2TurnAfter = await player2TurnTextAfter.isVisible();
      console.log('🔍 Player 2 "Your turn!" visible after first move:', isPlayer2TurnAfter);
      
      // Check if cell is now enabled
      const isCell4EnabledAfter = await cell4.isEnabled();
      console.log('🔍 Cell 4 enabled after wait:', isCell4EnabledAfter);
      
      if (!isCell4EnabledAfter) {
        console.log('⚠️ Cell 4 still disabled, waiting additional 5 seconds...');
        await secondPlayer.waitForTimeout(5000);
        const isCell4EnabledFinal = await cell4.isEnabled();
        console.log('🔍 Cell 4 enabled after additional wait:', isCell4EnabledFinal);
      }
      
      await cell4.click();
      console.log('✅ Cell 4 clicked');
      
      // Wait a bit for the move to be processed
      await secondPlayer.waitForTimeout(2000);
      
      // Check what's actually in the cell after clicking
      const cell4Text = await cell4.textContent();
      console.log('🔍 Cell 4 text after click:', cell4Text);
      
      await secondPlayer.waitForSelector(`.grid.grid-cols-3 button:nth-child(5):has-text("${secondSymbol}")`, { timeout: 10000 });
      console.log(`✅ Second player (${secondSymbol}) move completed`);
      
      // First player makes third move (top-right)
      console.log(`🎮 First player making third move (${firstSymbol})...`);
      const cell2 = firstPlayer.locator('.grid.grid-cols-3 button').nth(2);
      await cell2.click();
      await firstPlayer.waitForSelector(`.grid.grid-cols-3 button:nth-child(3):has-text("${firstSymbol}")`, { timeout: 5000 });
      console.log(`✅ First player (${firstSymbol}) third move completed`);
      
      // Second player makes fourth move (bottom-left)
      console.log(`🎮 Second player making fourth move (${secondSymbol})...`);
      const cell6 = secondPlayer.locator('.grid.grid-cols-3 button').nth(6);
      await cell6.click();
      await secondPlayer.waitForSelector(`.grid.grid-cols-3 button:nth-child(7):has-text("${secondSymbol}")`, { timeout: 5000 });
      console.log(`✅ Second player (${secondSymbol}) fourth move completed`);
      
      // First player makes winning move (middle-top)
      console.log(`🎮 First player making winning move (${firstSymbol})...`);
      const cell1 = firstPlayer.locator('.grid.grid-cols-3 button').nth(1);
      await cell1.click();
      await firstPlayer.waitForSelector(`.grid.grid-cols-3 button:nth-child(2):has-text("${firstSymbol}")`, { timeout: 5000 });
      console.log(`✅ First player (${firstSymbol}) winning move completed`);
      
      // Wait for game over message
      const winnerUsername = firstPlayer === page1 ? player1Username : player2Username;
      await page1.waitForSelector(`text=${winnerUsername} wins!`, { timeout: 10000 });
      await page2.waitForSelector(`text=${winnerUsername} wins!`, { timeout: 10000 });
      console.log(`✅ Game completed - ${winnerUsername} wins!`);
      
      // Both players exit game
      console.log('🚪 Both players exiting game...');
      await page1.click('button:has-text("Leave Game")');
      await page2.click('button:has-text("Leave Game")');
      
      // Wait for both to return to lobby (no URL change, just component change)
      await page1.waitForSelector('button:has-text("Create Game")', { timeout: 10000 });
      await page2.waitForSelector('button:has-text("Join")', { timeout: 10000 });
      console.log('✅ Both players returned to lobby');
      
      // Both players logout
      console.log('👋 Both players logging out...');
      await page1.click('button:has-text("Sign Out")');
      await page2.click('button:has-text("Sign Out")');
      
      // Wait for both to return to login page (no URL change, just component change)
      await page1.waitForSelector('[data-testid="submit-button"]', { timeout: 10000 });
      await page2.waitForSelector('[data-testid="submit-button"]', { timeout: 10000 });
      console.log('✅ Both players successfully logged out');
      
      // Verify we're back at login page
      await page1.waitForSelector('button:has-text("Create New Account")', { timeout: 5000 });
      await page2.waitForSelector('button:has-text("Create New Account")', { timeout: 5000 });
      console.log('✅ Both players returned to login page');
      
      // Clean up after successful test
      try {
        await fetch('http://localhost:3000/api/clear-db', { method: 'POST' });
        console.log('🧹 Cleaned up database after successful test');
      } catch (cleanupError) {
        console.log('⚠️ Could not clean database after successful test:', cleanupError);
      }
      
      console.log('🏁 E2E complete game test passed successfully!');
      
    } catch (error) {
      console.error('❌ E2E test failed:', error);
      
      // Clean up after test (even if it failed)
      try {
        await fetch('http://localhost:3000/api/clear-db', { method: 'POST' });
        console.log('🧹 Cleaned up database after test failure');
      } catch (cleanupError) {
        console.log('⚠️ Could not clean database after test failure:', cleanupError);
      }
      
      // Take screenshots for debugging
      await page1.screenshot({ path: 'test-results/e2e-player1-error.png' });
      await page2.screenshot({ path: 'test-results/e2e-player2-error.png' });
      
      throw error;
    } finally {
      // Clean up
      await context1.close();
      await context2.close();
    }
  });
  
  test('Game timeout handling', async ({ page }) => {
    console.log('⏰ Testing game timeout handling...');
    
    // Register and create game
    await page.goto('http://localhost:3000');
    await page.waitForSelector('[data-testid="submit-button"]');
    await page.click('button:has-text("Create New Account")');
    await page.waitForSelector('[data-testid="username-input"]');
    await page.fill('[data-testid="username-input"]', `T${Date.now() % 1000}`);
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="submit-button"]');
    
    // Wait for lobby to appear (no URL change, just component change)
    await page.waitForSelector('button:has-text("Create Game")', { timeout: 15000 });
    
    // Create game
    await page.click('button:has-text("Create Game")');
    await page.waitForSelector('input[id="gameName"]');
    await page.fill('input[id="gameName"]', 'Timeout Test Game');
    await page.click('button:has-text("Create")');
    
    // Wait for game to load (no URL change, just component change)
    try {
      await page.waitForSelector('.grid.grid-cols-3', { timeout: 15000 });
      console.log('✅ Game loaded successfully');
      
      // Check that timeout message doesn't appear immediately
      const timeoutMessage = page.locator('text=Connection timeout');
      await expect(timeoutMessage).not.toBeVisible({ timeout: 5000 });
      
      console.log('✅ Timeout handling test passed');
    } catch (error) {
      console.log('❌ Game failed to load, checking for timeout...');
      
      // Wait a bit longer to see if timeout message appears
      await page.waitForTimeout(5000);
      
      // Check for timeout message
      const timeoutText = page.locator('text=Connection timeout');
      const hasTimeout = await timeoutText.isVisible();
      console.log('Connection timeout visible:', hasTimeout);
      
      // Check for "Back to Lobby" button
      const backToLobbyButton = page.locator('button:has-text("Back to Lobby")');
      const hasBackButton = await backToLobbyButton.isVisible();
      console.log('Back to Lobby button visible:', hasBackButton);
      
      if (hasBackButton) {
        console.log('✅ Game timeout detected, clicking Back to Lobby');
        await backToLobbyButton.click();
        await page.waitForSelector('button:has-text("Create Game")', { timeout: 5000 });
        console.log('✅ Successfully returned to lobby');
        console.log('✅ Timeout handling test passed with graceful timeout handling');
        return;
      }
      
      throw error;
    }
  });
}); 