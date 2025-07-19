import { test, expect } from '@playwright/test';

test.describe('Tic-Tac-Toe E2E Game Flow', () => {
  test('Two players can play a complete game from start to finish', async ({ browser }) => {
    // Create two browser contexts to simulate two different players
    const player1Context = await browser.newContext();
    const player2Context = await browser.newContext();
    
    const player1Page = await player1Context.newPage();
    const player2Page = await player2Context.newPage();

    console.log('🧪 Starting Playwright E2E Game Test...');

    try {
      // Test 1: Both players navigate to the application
      console.log('📋 Test 1: Navigation and Authentication');
      
      await player1Page.goto('http://localhost:3000');
      await player2Page.goto('http://localhost:3000');
      
      // Wait for the page to load
      await player1Page.waitForLoadState('networkidle');
      await player2Page.waitForLoadState('networkidle');
      
      console.log('✅ Both players loaded the application');

      // Test 2: Player 1 registers and logs in
      console.log('📋 Test 2: Player 1 Authentication');
      
      // Register player 1
      await player1Page.click('text=Sign Up');
      await player1Page.fill('input[name="username"]', 'playwright_player1');
      await player1Page.fill('input[name="password"]', 'testpass123');
      await player1Page.click('button[type="submit"]');
      
      // Wait for registration to complete
      await player1Page.waitForSelector('text=Welcome, playwright_player1', { timeout: 10000 });
      console.log('✅ Player 1 registered and logged in');

      // Test 3: Player 2 registers and logs in
      console.log('📋 Test 3: Player 2 Authentication');
      
      await player2Page.click('text=Sign Up');
      await player2Page.fill('input[name="username"]', 'playwright_player2');
      await player2Page.fill('input[name="password"]', 'testpass123');
      await player2Page.click('button[type="submit"]');
      
      // Wait for registration to complete
      await player2Page.waitForSelector('text=Welcome, playwright_player2', { timeout: 10000 });
      console.log('✅ Player 2 registered and logged in');

      // Test 4: Player 1 creates a game
      console.log('📋 Test 4: Game Creation');
      
      await player1Page.click('text=Create Game');
      await player1Page.fill('input[placeholder="Enter game name"]', 'Playwright Test Game');
      await player1Page.click('button:has-text("Create")');
      
      // Wait for game to be created and show waiting state
      await player1Page.waitForSelector('text=Waiting for players to join', { timeout: 10000 });
      console.log('✅ Player 1 created a game');

      // Test 5: Player 2 joins the game
      console.log('📋 Test 5: Game Joining');
      
      // Wait for the game to appear in the lobby
      await player2Page.waitForSelector('text=Playwright Test Game', { timeout: 10000 });
      await player2Page.click('button:has-text("Join")');
      
      // Wait for both players to be in the game
      await player1Page.waitForSelector('text=playwright_player1', { timeout: 10000 });
      await player1Page.waitForSelector('text=playwright_player2', { timeout: 10000 });
      await player2Page.waitForSelector('text=playwright_player1', { timeout: 10000 });
      await player2Page.waitForSelector('text=playwright_player2', { timeout: 10000 });
      
      console.log('✅ Player 2 joined the game');

      // Test 6: Game starts and players can make moves
      console.log('📋 Test 6: Gameplay');
      
      // Wait for the game to start (status should change from "waiting" to "playing")
      await player1Page.waitForSelector('text=Your turn', { timeout: 10000 });
      await player2Page.waitForSelector('text=Waiting for opponent', { timeout: 10000 });
      
      console.log('✅ Game started successfully');

      // Test 7: Play a complete game
      console.log('📋 Test 7: Complete Game Playthrough');
      
      // Create a winning scenario for Player 1 (X) - first row: [0,1,2]
      // Player 1 makes first move (top-left)
      await player1Page.click('[data-testid="cell-0"]');
      await player1Page.waitForSelector('[data-testid="cell-0"]:has-text("X")', { timeout: 5000 });
      console.log('✅ Player 1 made move at position 0');
      
      // Player 2 makes second move (center)
      await player2Page.waitForSelector('text=Your turn', { timeout: 10000 });
      await player2Page.click('[data-testid="cell-4"]');
      await player2Page.waitForSelector('[data-testid="cell-4"]:has-text("O")', { timeout: 5000 });
      console.log('✅ Player 2 made move at position 4');
      
      // Player 1 makes third move (top-middle)
      await player1Page.waitForSelector('text=Your turn', { timeout: 10000 });
      await player1Page.click('[data-testid="cell-1"]');
      await player1Page.waitForSelector('[data-testid="cell-1"]:has-text("X")', { timeout: 5000 });
      console.log('✅ Player 1 made move at position 1');
      
      // Player 2 makes fourth move (bottom-right)
      await player2Page.waitForSelector('text=Your turn', { timeout: 10000 });
      await player2Page.click('[data-testid="cell-8"]');
      await player2Page.waitForSelector('[data-testid="cell-8"]:has-text("O")', { timeout: 5000 });
      console.log('✅ Player 2 made move at position 8');
      
      // Player 1 makes winning move (top-right)
      await player1Page.waitForSelector('text=Your turn', { timeout: 10000 });
      await player1Page.click('[data-testid="cell-2"]');
      await player1Page.waitForSelector('[data-testid="cell-2"]:has-text("X")', { timeout: 5000 });
      console.log('✅ Player 1 made winning move at position 2');

      // Test 8: Verify game completion
      console.log('📋 Test 8: Game Completion Verification');
      
      // Wait for game to show completion state
      await player1Page.waitForSelector('text=Game Over', { timeout: 10000 });
      await player2Page.waitForSelector('text=Game Over', { timeout: 10000 });
      
      // Verify winner is displayed
      await player1Page.waitForSelector('text=playwright_player1 wins!', { timeout: 10000 });
      await player2Page.waitForSelector('text=playwright_player1 wins!', { timeout: 10000 });
      
      console.log('✅ Game completed with correct winner');

      // Test 9: Verify game board state
      console.log('📋 Test 9: Final Board State Verification');
      
      // Verify the final board state shows the winning combination
      const player1Board = await player1Page.locator('[data-testid="game-board"]').textContent();
      const player2Board = await player2Page.locator('[data-testid="game-board"]').textContent();
      
      // Both players should see the same board state
      expect(player1Board).toBe(player2Board);
      console.log('✅ Both players see the same final board state');

      // Test 10: Players can start a new game
      console.log('📋 Test 10: New Game Functionality');
      
      // Click "Play Again" or "New Game" button
      await player1Page.click('button:has-text("New Game")');
      await player2Page.click('button:has-text("New Game")');
      
      // Verify both players are back in the lobby
      await player1Page.waitForSelector('text=Available Games', { timeout: 10000 });
      await player2Page.waitForSelector('text=Available Games', { timeout: 10000 });
      
      console.log('✅ Both players returned to lobby successfully');

      console.log('\n🎉 All E2E tests passed! Complete game flow is working correctly.');

    } catch (error) {
      console.error('❌ E2E test failed:', error);
      throw error;
    } finally {
      // Cleanup: Close browser contexts
      await player1Context.close();
      await player2Context.close();
    }
  });

  test('Game handles player disconnection gracefully', async ({ browser }) => {
    const player1Context = await browser.newContext();
    const player2Context = await browser.newContext();
    
    const player1Page = await player1Context.newPage();
    const player2Page = await player2Context.newPage();

    console.log('🧪 Testing player disconnection handling...');

    try {
      // Setup: Both players login and start a game
      await player1Page.goto('http://localhost:3000');
      await player2Page.goto('http://localhost:3000');
      
      // Quick login for both players
      await player1Page.click('text=Sign Up');
      await player1Page.fill('input[name="username"]', 'disconnect_test1');
      await player1Page.fill('input[name="password"]', 'testpass123');
      await player1Page.click('button[type="submit"]');
      
      await player2Page.click('text=Sign Up');
      await player2Page.fill('input[name="username"]', 'disconnect_test2');
      await player2Page.fill('input[name="password"]', 'testpass123');
      await player2Page.click('button[type="submit"]');
      
      // Create and join game
      await player1Page.click('text=Create Game');
      await player1Page.fill('input[placeholder="Enter game name"]', 'Disconnect Test');
      await player1Page.click('button:has-text("Create")');
      
      await player2Page.waitForSelector('text=Disconnect Test', { timeout: 10000 });
      await player2Page.click('button:has-text("Join")');
      
      // Wait for game to start
      await player1Page.waitForSelector('text=Your turn', { timeout: 10000 });
      
      // Simulate player 2 disconnection by closing their context
      await player2Context.close();
      
      // Player 1 should see that player 2 disconnected
      await player1Page.waitForSelector('text=Opponent disconnected', { timeout: 10000 });
      
      console.log('✅ Disconnection handling works correctly');
      
    } catch (error) {
      console.error('❌ Disconnection test failed:', error);
      throw error;
    } finally {
      await player1Context.close();
    }
  });
}); 