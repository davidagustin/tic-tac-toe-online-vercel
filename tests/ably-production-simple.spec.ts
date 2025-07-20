import { expect, test } from '@playwright/test';

test.describe('Ably Production Simple E2E Test', () => {
    const PRODUCTION_URL = 'https://tic-tac-toe-online-vercel.vercel.app';

    test('Basic Ably production test - two players complete game', async ({ browser }) => {
        console.log('🎮 Starting Simple Ably Production Test');

        // Create two browser contexts for two players
        const user1Context = await browser.newContext();
        const user2Context = await browser.newContext();

        const user1Page = await user1Context.newPage();
        const user2Page = await user2Context.newPage();

        try {
            // Navigate both users to the production app
            await user1Page.goto(PRODUCTION_URL);
            await user2Page.goto(PRODUCTION_URL);

            console.log('✅ Both users navigated to production app');

            // Wait for pages to load
            await user1Page.waitForLoadState('networkidle');
            await user2Page.waitForLoadState('networkidle');

            // Register User 1
            await user1Page.click('text=Don\'t have an account? Sign up');
            await user1Page.fill('input[name="userName"]', 'SimplePlayer1');
            await user1Page.fill('input[name="password"]', 'password123');
            await user1Page.click('button[type="submit"]');

            // Wait for registration and redirect to lobby
            await user1Page.waitForSelector('text=Welcome to Tic-Tac-Toe Online', { timeout: 20000 });
            console.log('✅ User 1 registered and in lobby');

            // Register User 2
            await user2Page.click('text=Don\'t have an account? Sign up');
            await user2Page.fill('input[name="userName"]', 'SimplePlayer2');
            await user2Page.fill('input[name="password"]', 'password123');
            await user2Page.click('button[type="submit"]');

            // Wait for registration and redirect to lobby
            await user2Page.waitForSelector('text=Welcome to Tic-Tac-Toe Online', { timeout: 20000 });
            console.log('✅ User 2 registered and in lobby');

            // Check if both users show as connected to real-time
            const user1Connected = await user1Page.locator('text=Real-time connected').isVisible();
            const user2Connected = await user2Page.locator('text=Real-time connected').isVisible();

            expect(user1Connected).toBeTruthy();
            expect(user2Connected).toBeTruthy();
            console.log('✅ Both users connected to Ably real-time');

            // User 1 creates a game
            await user1Page.click('text=Create New Game');
            await user1Page.fill('input[placeholder*="game name"]', 'Simple Test Game');
            await user1Page.click('button:has-text("Create Game")');

            // Wait for game creation and redirect
            await user1Page.waitForSelector('text=Game Board', { timeout: 20000 });
            console.log('✅ User 1 created game and joined');

            // Refresh User 2's lobby to see the new game
            await user2Page.reload();
            await user2Page.waitForLoadState('networkidle');

            // Wait for the game to appear in the lobby
            await user2Page.waitForSelector('text=Simple Test Game', { timeout: 20000 });
            console.log('✅ Game appeared in User 2\'s lobby');

            // User 2 joins the game
            await user2Page.click('button:has-text("Join")');

            // Wait for User 2 to join the game
            await user2Page.waitForSelector('text=Game Board', { timeout: 20000 });
            console.log('✅ User 2 joined the game');

            // Wait for game to start
            await user1Page.waitForSelector('text=SimplePlayer1\'s turn', { timeout: 20000 });
            console.log('✅ Game started - SimplePlayer1\'s turn');

            // Player 1 makes first move (top-left)
            await user1Page.click('[data-testid="cell-0-0"]');
            await user1Page.waitForTimeout(3000);

            // Check if Player 2 sees the move
            await user2Page.waitForSelector('text=SimplePlayer2\'s turn', { timeout: 20000 });
            console.log('✅ Player 1 made move, Player 2\'s turn');

            // Verify the move appears on both boards
            const user1Cell = await user1Page.locator('[data-testid="cell-0-0"]').textContent();
            const user2Cell = await user2Page.locator('[data-testid="cell-0-0"]').textContent();

            expect(user1Cell).toBe('X');
            expect(user2Cell).toBe('X');
            console.log('✅ Move synchronized across both players');

            // Player 2 makes move (center)
            await user2Page.click('[data-testid="cell-1-1"]');
            await user2Page.waitForTimeout(3000);

            // Check if Player 1 sees the move
            await user1Page.waitForSelector('text=SimplePlayer1\'s turn', { timeout: 20000 });
            console.log('✅ Player 2 made move, Player 1\'s turn');

            // Verify the move appears on both boards
            const user1CenterCell = await user1Page.locator('[data-testid="cell-1-1"]').textContent();
            const user2CenterCell = await user2Page.locator('[data-testid="cell-1-1"]').textContent();

            expect(user1CenterCell).toBe('O');
            expect(user2CenterCell).toBe('O');
            console.log('✅ Second move synchronized across both players');

            // Continue game to completion
            // Player 1 makes move (top-right)
            await user1Page.click('[data-testid="cell-0-2"]');
            await user1Page.waitForTimeout(3000);

            // Player 2 makes move (bottom-left)
            await user2Page.click('[data-testid="cell-2-0"]');
            await user2Page.waitForTimeout(3000);

            // Player 1 makes move (middle-left) - this should win for Player 1
            await user1Page.click('[data-testid="cell-1-0"]');
            await user1Page.waitForTimeout(3000);

            // Check for game end on both players
            const user1GameEnded = await user1Page.locator('text=SimplePlayer1 wins').isVisible() ||
                await user1Page.locator('text=SimplePlayer2 wins').isVisible() ||
                await user1Page.locator('text=It\'s a draw').isVisible();

            const user2GameEnded = await user2Page.locator('text=SimplePlayer1 wins').isVisible() ||
                await user2Page.locator('text=SimplePlayer2 wins').isVisible() ||
                await user2Page.locator('text=It\'s a draw').isVisible();

            expect(user1GameEnded).toBeTruthy();
            expect(user2GameEnded).toBeTruthy();
            console.log('✅ Game end detected on both players');

            // Test chat functionality
            await user1Page.fill('input[placeholder*="message"]', 'Great simple game!');
            await user1Page.click('button:has-text("Send")');
            await user1Page.waitForTimeout(3000);

            // Check if User 2 receives the message
            const messageReceived = await user2Page.locator('text=Great simple game!').isVisible();
            expect(messageReceived).toBeTruthy();
            console.log('✅ Chat message sent and received');

            // Exit game
            await user1Page.click('button:has-text("Back to Lobby")');
            await user1Page.waitForSelector('text=Welcome to Tic-Tac-Toe Online', { timeout: 15000 });
            console.log('✅ User 1 exited game and returned to lobby');

            await user2Page.click('button:has-text("Back to Lobby")');
            await user2Page.waitForSelector('text=Welcome to Tic-Tac-Toe Online', { timeout: 15000 });
            console.log('✅ User 2 exited game and returned to lobby');

            // Logout
            await user1Page.click('button:has-text("Sign Out")');
            await user1Page.waitForSelector('text=Welcome Back', { timeout: 15000 });
            console.log('✅ User 1 logged out successfully');

            await user2Page.click('button:has-text("Sign Out")');
            await user2Page.waitForSelector('text=Welcome Back', { timeout: 15000 });
            console.log('✅ User 2 logged out successfully');

            console.log('\n🎉 Simple Ably Production Test Completed Successfully!');
            console.log('✅ All core real-time features working perfectly with Ably on production');

        } catch (error) {
            console.error('❌ Simple Ably Production Test Failed:', error);

            // Take screenshots for debugging
            await user1Page.screenshot({ path: 'ably-simple-prod-user1-error.png' });
            await user2Page.screenshot({ path: 'ably-simple-prod-user2-error.png' });
            console.log('📸 Error screenshots saved');

            throw error;
        } finally {
            // Cleanup
            await user1Context.close();
            await user2Context.close();
            console.log('🧹 Browser cleanup completed');
        }
    });
}); 