import { test, expect, BrowserContext, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 60_000;

test.setTimeout(TEST_TIMEOUT);

function uniqueUsername(prefix: string) {
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // 3 digit random number
  return `${prefix}${timestamp}${random}`; // Should be around 12-15 characters
}

test.describe('UI E2E: Two Players Full Game Flow', () => {
  let context1: BrowserContext;
  let context2: BrowserContext;
  let page1: Page;
  let page2: Page;
  const PLAYER1 = { username: uniqueUsername('p1'), password: 'pw12345' };
  const PLAYER2 = { username: uniqueUsername('p2'), password: 'pw12345' };

  test('Two players play a full game, leave, see stats, and log out', async ({ browser }) => {
  test.setTimeout(30000); // Reduce timeout to 30 seconds to fail faster
  let page1, page2;
  
  try {
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
    
    context1 = await browser.newContext();
    context2 = await browser.newContext();
    page1 = await context1.newPage();
    page2 = await context2.newPage();

    // Listen for console errors and network requests
    page1.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Page 1 Console Error:', msg.text());
      }
    });

    page1.on('request', request => {
      if (request.url().includes('/api/auth/register')) {
        console.log('Registration request URL:', request.url());
        console.log('Registration request method:', request.method());
        console.log('Registration request headers:', request.headers());
      }
    });

    page1.on('response', response => {
      if (response.url().includes('/api/auth/register')) {
        console.log('Registration response status:', response.status());
        console.log('Registration response headers:', response.headers());
        response.text().then(text => {
          console.log('Registration response body:', text);
        }).catch(err => {
          console.log('Could not read response body:', err);
        });
      }
    });

    // --- Player 1 registers ---
    await page1.goto(BASE_URL);
    await page1.waitForSelector('input#username', { timeout: 10000 });
    
    // Switch to register mode if needed
    if (await page1.locator('button:has-text("Sign up")').isVisible()) {
      await page1.click('button:has-text("Sign up")');
    }
    
    console.log('Filling registration form for player 1:', PLAYER1.username);
    await page1.fill('input#username', PLAYER1.username);
    await page1.fill('input#password', PLAYER1.password);
    
    console.log('Submitting registration form for player 1');
    await page1.click('button[type="submit"]');
    
    // Wait a bit and check what's on the page
    await page1.waitForTimeout(3000);
    const pageContent = await page1.content();
    console.log('Page 1 content after submission:', pageContent.substring(0, 500));
    
    // Wait for either success message OR lobby welcome message (since success message disappears quickly)
    try {
      await page1.waitForSelector('text=Account created successfully!, text=Successfully signed in!', { timeout: 5000 });
      console.log('Success message found for player 1');
    } catch (error) {
      // If success message doesn't appear, check if we're already in the lobby
      console.log('Success message not found for player 1, checking for lobby...');
    }
    
    // Check if we got to the lobby
    console.log('Waiting for lobby welcome message for player 1');
    await page1.waitForSelector('text=Welcome, ' + PLAYER1.username + '!', { timeout: 15000 });

    // --- Player 2 registers ---
    await page2.goto(BASE_URL);
    await page2.waitForSelector('input#username', { timeout: 10000 });
    
    if (await page2.locator('button:has-text("Sign up")').isVisible()) {
      await page2.click('button:has-text("Sign up")');
    }
    
    console.log('Filling registration form for player 2:', PLAYER2.username);
    await page2.fill('input#username', PLAYER2.username);
    await page2.fill('input#password', PLAYER2.password);
    
    console.log('Submitting registration form for player 2');
    await page2.click('button[type="submit"]');
    
    // Wait for either success message OR lobby welcome message
    try {
      await page2.waitForSelector('text=Account created successfully!, text=Successfully signed in!', { timeout: 5000 });
      console.log('Success message found for player 2');
    } catch (error) {
      // If success message doesn't appear, check if we're already in the lobby
      console.log('Success message not found for player 2, checking for lobby...');
    }
    
    console.log('Waiting for lobby welcome message for player 2');
    await page2.waitForSelector('text=Welcome, ' + PLAYER2.username + '!', { timeout: 15000 });

    // --- Player 1 creates a game ---
    await page1.waitForSelector('button:has-text("Create Game")', { timeout: 3000 });
    await page1.click('button:has-text("Create Game")');
    
    // Fill in the game name
    await page1.waitForSelector('input[placeholder*="game name"], input[name="gameName"]', { timeout: 3000 });
    await page1.fill('input[placeholder*="game name"], input[name="gameName"]', 'Test Game');
    
    // Click Create Game button again (now it should be enabled)
    console.log('Creating game...');
    
    // Listen for network requests to see if game creation API is called
    page1.on('request', request => {
      if (request.url().includes('/api/game/create')) {
        console.log('Game creation request:', request.url(), request.method());
      }
    });
    
    page1.on('response', response => {
      if (response.url().includes('/api/game/create')) {
        console.log('Game creation response:', response.status(), response.url());
        response.text().then(text => {
          console.log('Game creation response body:', text);
        }).catch(err => {
          console.log('Could not read response body:', err);
        });
      }
    });
    
    await page1.click('button:has-text("Create Game")');
    
    // Wait a bit and check the page content to see what's happening
    await page1.waitForTimeout(3000);
    const gamePageContent = await page1.content();
    console.log('Page content after game creation:', gamePageContent.substring(0, 1000));
    
    // Check if we're still in the lobby or if we're in the game
    const isInGame = await page1.locator('text=Your turn!').isVisible();
    const isInLobby = await page1.locator('text=Welcome, ' + PLAYER1.username + '!').isVisible();
    console.log('Is in game:', isInGame, 'Is in lobby:', isInLobby);
    
    if (!isInGame) {
      console.log('Player 1 is not in game, waiting longer...');
      await page1.waitForTimeout(5000);
      const updatedContent = await page1.content();
      console.log('Updated page content:', updatedContent.substring(0, 1000));
    }
    
    // Wait for either "Your turn!" or "Waiting for players..." depending on game status
    try {
      await page1.waitForSelector('text=Your turn!', { timeout: 5000 });
      console.log('Player 1 sees "Your turn!"');
    } catch (error) {
      console.log('Player 1 does not see "Your turn!", checking for "Waiting for players..."');
      try {
        await page1.waitForSelector('text=Waiting for players...', { timeout: 5000 });
        console.log('Player 1 sees "Waiting for players..."');
      } catch (error2) {
        console.log('Player 1 does not see either message, capturing DOM and screenshots...');
        
        // Save DOM to files
        const page1Content = await page1.content();
        const page2Content = await page2.content();
        const fs = require('fs');
        fs.writeFileSync('player1-no-message-dom.html', page1Content);
        fs.writeFileSync('player2-no-message-dom.html', page2Content);
        console.log('📄 DOM files saved: player1-no-message-dom.html, player2-no-message-dom.html');
        
        // Take screenshots
        await page1.screenshot({ path: 'player1-no-message.png' });
        await page2.screenshot({ path: 'player2-no-message.png' });
        console.log('📸 Screenshots saved: player1-no-message.png, player2-no-message.png');
        
        // Continue anyway - the game might be in a different state
      }
    }

    // --- Player 2 joins the game ---
    await page2.waitForSelector('button:has-text("Join Game")', { timeout: 3000 });
    
    // Take screenshots of both browsers before joining
    await page1.screenshot({ path: 'player1-game-before-join.png' });
    await page2.screenshot({ path: 'player2-lobby-before-join.png' });
    console.log('📸 Screenshots taken: Player 1 game and Player 2 lobby before joining');
    
    await page2.click('button:has-text("Join Game")');
    console.log('Player 2 clicked Join Game button');
    
    // Wait a moment for the join to process
    await page2.waitForTimeout(2000);
    
    // Capture DOM and screenshots immediately after join attempt
    const page1Content = await page1.content();
    const page2Content = await page2.content();
    const fs = require('fs');
    fs.writeFileSync('player1-after-join-dom.html', page1Content);
    fs.writeFileSync('player2-after-join-dom.html', page2Content);
    console.log('📄 DOM files saved: player1-after-join-dom.html, player2-after-join-dom.html');
    
    await page1.screenshot({ path: 'player1-after-join.png' });
    await page2.screenshot({ path: 'player2-after-join.png' });
    console.log('📸 Screenshots saved: player1-after-join.png, player2-after-join.png');
    
    // Debug: Check if cells are actually disabled by trying to get their disabled state
    const cells = await page1.$$('.game-cell');
    console.log(`🔍 Found ${cells.length} game cells`);
    
    for (let i = 0; i < cells.length; i++) {
      const isDisabled = await cells[i].isDisabled();
      const ariaLabel = await cells[i].getAttribute('aria-label');
      console.log(`🔍 Cell ${i + 1}: disabled=${isDisabled}, aria-label="${ariaLabel}"`);
    }
    
    // Debug: Get browser console logs
    const logs = await page1.evaluate(() => {
      return (window as any).consoleLogs || [];
    });
    console.log('🔍 Browser console logs:', logs);
    
    // Debug: Check if the Game component is rendering
    const gameComponent = await page1.$('[data-testid="game-component"]');
    console.log('🔍 Game component found:', !!gameComponent);
    
    // Wait for either "Your turn!" or the opponent's name to appear
    try {
      await page2.waitForSelector('text=Your turn!', { timeout: 3000 });
      console.log('Player 2 sees "Your turn!"');
    } catch (error) {
      console.log('Player 2 does not see "Your turn!", checking for opponent name...');
      try {
        // Look for the opponent's name (Player 1) in the Current Turn section
        await page2.waitForSelector(`text=${PLAYER1.username}`, { timeout: 3000 });
        console.log('Player 2 sees opponent name');
      } catch (error2) {
        console.log('Player 2 does not see opponent name, but continuing...');
      }
    }

    // --- Play the game: Player 1 wins (top row) ---
    console.log('Starting actual gameplay...');
    
    // Wait for both players to see the game board
    await page1.waitForSelector('.game-board', { timeout: 10000 });
    await page2.waitForSelector('.game-board', { timeout: 10000 });
    console.log('Both players can see the game board');
    
    // Determine who goes first by checking which player sees "Your turn!"
    let firstPlayer, secondPlayer;
    let firstPlayerPage, secondPlayerPage;
    
    try {
      await page1.waitForSelector('text=Your turn!', { timeout: 5000 });
      console.log('Player 1 goes first');
      firstPlayer = PLAYER1;
      secondPlayer = PLAYER2;
      firstPlayerPage = page1;
      secondPlayerPage = page2;
    } catch (error) {
      console.log('Player 2 goes first');
      firstPlayer = PLAYER2;
      secondPlayer = PLAYER1;
      firstPlayerPage = page2;
      secondPlayerPage = page1;
    }
    
    console.log(`Starting moves - ${firstPlayer.username} goes first`);
    
    // First player makes move (top-left cell)
    try {
      await firstPlayerPage.click('.game-cell:first-child');
      console.log(`${firstPlayer.username} clicked top-left cell`);
    } catch (error) {
      console.log('Failed to click first cell, capturing DOM and screenshots...');
      
      // Save DOM to files
      const page1Content = await page1.content();
      const page2Content = await page2.content();
      const fs = require('fs');
      fs.writeFileSync('player1-first-move-dom.html', page1Content);
      fs.writeFileSync('player2-first-move-dom.html', page2Content);
      console.log('📄 DOM files saved: player1-first-move-dom.html, player2-first-move-dom.html');
      
      // Take screenshots
      await page1.screenshot({ path: 'player1-first-move.png' });
      await page2.screenshot({ path: 'player2-first-move.png' });
      console.log('📸 Screenshots saved: player1-first-move.png, player2-first-move.png');
      
      throw error; // Re-throw to fail the test
    }
    await secondPlayerPage.waitForTimeout(2000); // Wait for state update
    
    // Second player should now see "Your turn!"
    await secondPlayerPage.waitForSelector('text=Your turn!', { timeout: 10000 });
    console.log(`${secondPlayer.username} sees "Your turn!"`);
    
    // Second player makes move (center cell)
    await secondPlayerPage.click('.game-cell:nth-child(5)');
    console.log(`${secondPlayer.username} clicked center cell`);
    await firstPlayerPage.waitForTimeout(2000); // Wait for state update
    
    // First player makes move (top-center cell)
    await firstPlayerPage.waitForSelector('text=Your turn!', { timeout: 10000 });
    await firstPlayerPage.click('.game-cell:nth-child(2)');
    console.log(`${firstPlayer.username} clicked top-center cell`);
    await secondPlayerPage.waitForTimeout(2000); // Wait for state update
    
    // Second player makes move (bottom-right cell)
    await secondPlayerPage.waitForSelector('text=Your turn!', { timeout: 10000 });
    await secondPlayerPage.click('.game-cell:nth-child(9)');
    console.log(`${secondPlayer.username} clicked bottom-right cell`);
    await firstPlayerPage.waitForTimeout(2000); // Wait for state update
    
    // First player makes winning move (top-right cell)
    await firstPlayerPage.waitForSelector('text=Your turn!', { timeout: 10000 });
    await firstPlayerPage.click('.game-cell:nth-child(3)');
    console.log(`${firstPlayer.username} clicked top-right cell - should win!`);
    
    // Wait for game end messages
    await firstPlayerPage.waitForSelector('text=You win', { timeout: 10000 });
    await secondPlayerPage.waitForSelector('text=You lose', { timeout: 10000 });
    console.log(`Game ended - ${firstPlayer.username} won, ${secondPlayer.username} lost`);

    // --- Both exit the game (Back to Lobby) ---
    await page1.click('button:has-text("Back to Lobby")');
    await page2.click('button:has-text("Back to Lobby")');
    await page1.waitForSelector('text=Welcome, ' + PLAYER1.username + '!', { timeout: 3000 });
    await page2.waitForSelector('text=Welcome, ' + PLAYER2.username + '!', { timeout: 3000 });

    // --- Both check stats (if visible in lobby) ---
    console.log('Checking player stats after the game...');
    
    // Wait for stats to be visible
    await page1.waitForSelector('text=Wins:', { timeout: 5000 });
    await page2.waitForSelector('text=Losses:', { timeout: 5000 });
    
    // Verify the winner has 1 win and 0 losses
    const winnerPage = firstPlayer.username === PLAYER1.username ? page1 : page2;
    const loserPage = firstPlayer.username === PLAYER1.username ? page2 : page1;
    
    await expect(winnerPage.locator('text=Wins: 1')).toBeVisible({ timeout: 3000 });
    await expect(winnerPage.locator('text=Losses: 0')).toBeVisible({ timeout: 3000 });
    console.log(`✅ ${firstPlayer.username} stats: 1 win, 0 losses confirmed`);
    
    // Verify the loser has 0 wins and 1 loss
    await expect(loserPage.locator('text=Wins: 0')).toBeVisible({ timeout: 3000 });
    await expect(loserPage.locator('text=Losses: 1')).toBeVisible({ timeout: 3000 });
    console.log(`✅ ${secondPlayer.username} stats: 0 wins, 1 loss confirmed`);
    
    console.log('✅ Stats verification complete');

    // --- Both log out ---
    await page1.click('button:has-text("Sign Out")');
    await page2.click('button:has-text("Sign Out")');
    await page1.waitForSelector('input#username', { timeout: 3000 });
    await page2.waitForSelector('input#username', { timeout: 3000 });
    
    // Take final screenshots before browsers close
    await page1.screenshot({ path: 'player1-final-state.png' });
    await page2.screenshot({ path: 'player2-final-state.png' });
    console.log('📸 Final screenshots taken before browsers close');
    
    // Clear database after test
    console.log('🧹 Clearing database after test...');
    try {
      await fetch('http://localhost:3000/api/clear-db', { method: 'POST' });
      console.log('🧹 Database cleared successfully');
    } catch (error) {
      console.log('🧹 Database clear failed:', error);
    }
  } catch (error) {
    // Take emergency screenshots if test fails
    if (page1) {
      await page1.screenshot({ path: 'player1-error-state.png' });
      console.log('📸 Emergency screenshot taken for Player 1');
    }
    if (page2) {
      await page2.screenshot({ path: 'player2-error-state.png' });
      console.log('📸 Emergency screenshot taken for Player 2');
    }
    throw error; // Re-throw the error to fail the test
  }
  });
}); 