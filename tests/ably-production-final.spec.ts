import { expect, test } from '@playwright/test';

test.describe('Ably Production Final Comprehensive Test', () => {
    const PRODUCTION_URL = 'https://tic-tac-toe-online-vercel.vercel.app';

    test('Complete Ably production game flow with two players', async ({ browser }) => {
        console.log('🎮 Starting Final Ably Production Test - Complete Game Flow');

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

            // Test 1: User Registration
            console.log('\n📝 Test 1: User Registration');

            // Register User 1
            await user1Page.click('text=Don\'t have an account? Sign up');
            await user1Page.waitForTimeout(2000);
            await user1Page.fill('input[name="userName"]', 'FinalPlayer1');
            await user1Page.fill('input[name="password"]', 'password123');
            await user1Page.click('button[type="submit"]');

            // Wait for registration and redirect to lobby
            await user1Page.waitForSelector('text=Welcome to Tic-Tac-Toe Online', { timeout: 30000 });
            console.log('✅ User 1 registered and in lobby');

            // Register User 2
            await user2Page.click('text=Don\'t have an account? Sign up');
            await user2Page.waitForTimeout(2000);
            await user2Page.fill('input[name="userName"]', 'FinalPlayer2');
            await user2Page.fill('input[name="password"]', 'password123');
            await user2Page.click('button[type="submit"]');

            // Wait for registration and redirect to lobby
            await user2Page.waitForSelector('text=Welcome to Tic-Tac-Toe Online', { timeout: 30000 });
            console.log('✅ User 2 registered and in lobby');

            // Test 2: Verify Ably Connection Status
            console.log('\n🔌 Test 2: Verify Ably Connection Status');

            // Check if both users show as connected to real-time
            const user1Connected = await user1Page.locator('text=Real-time connected').isVisible();
            const user2Connected = await user2Page.locator('text=Real-time connected').isVisible();

            expect(user1Connected).toBeTruthy();
            expect(user2Connected).toBeTruthy();
            console.log('✅ Both users connected to Ably real-time');

            // Test 3: Game Creation
            console.log('\n🎮 Test 3: Game Creation');

            // User 1 creates a game
            await user1Page.click('text=Create New Game');
            await user1Page.waitForTimeout(2000);
            await user1Page.fill('input[placeholder*="game name"]', 'Final Test Game');
            await user1Page.click('button:has-text("Create Game")');

            // Wait for game creation and redirect
            await user1Page.waitForSelector('text=Game Board', { timeout: 30000 });
            console.log('✅ User 1 created game and joined');

            // Test 4: Real-time Game Joining
            console.log('\n👥 Test 4: Real-time Game Joining');

            // Refresh User 2's lobby to see the new game
            await user2Page.reload();
            await user2Page.waitForLoadState('networkidle');

            // Wait for the game to appear in the lobby
            await user2Page.waitForSelector('text=Final Test Game', { timeout: 30000 });
            console.log('✅ Game appeared in User 2\'s lobby');

            // User 2 joins the game
            await user2Page.click('button:has-text("Join")');

            // Wait for User 2 to join the game
            await user2Page.waitForSelector('text=Game Board', { timeout: 30000 });
            console.log('✅ User 2 joined the game');

            // Test 5: Real-time Gameplay
            console.log('\n🎯 Test 5: Real-time Gameplay');

            // Wait for game to start
            await user1Page.waitForSelector('text=FinalPlayer1\'s turn', { timeout: 30000 });
            console.log('✅ Game started - FinalPlayer1\'s turn');

            // Player 1 makes first move (top-left)
            await user1Page.click('[data-testid="cell-0-0"]');
            await user1Page.waitForTimeout(3000);

            // Check if Player 2 sees the move
            await user2Page.waitForSelector('text=FinalPlayer2\'s turn', { timeout: 30000 });
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
            await user1Page.waitForSelector('text=FinalPlayer1\'s turn', { timeout: 30000 });
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

            // Test 6: Game End Detection
            console.log('\n🏆 Test 6: Game End Detection');

            // Check for game end on both players
            const user1GameEnded = await user1Page.locator('text=FinalPlayer1 wins').isVisible() ||
                await user1Page.locator('text=FinalPlayer2 wins').isVisible() ||
                await user1Page.locator('text=It\'s a draw').isVisible();

            const user2GameEnded = await user2Page.locator('text=FinalPlayer1 wins').isVisible() ||
                await user2Page.locator('text=FinalPlayer2 wins').isVisible() ||
                await user2Page.locator('text=It\'s a draw').isVisible();

            expect(user1GameEnded).toBeTruthy();
            expect(user2GameEnded).toBeTruthy();
            console.log('✅ Game end detected on both players');

            // Test 7: Chat Functionality
            console.log('\n💬 Test 7: Chat Functionality');

            // User 1 sends a chat message
            await user1Page.fill('input[placeholder*="message"]', 'Great final game!');
            await user1Page.click('button:has-text("Send")');
            await user1Page.waitForTimeout(3000);

            // Check if User 2 receives the message
            const messageReceived = await user2Page.locator('text=Great final game!').isVisible();
            expect(messageReceived).toBeTruthy();
            console.log('✅ Chat message sent and received');

            // Test 8: Exit Game and Statistics
            console.log('\n📊 Test 8: Exit Game and Statistics');

            // User 1 exits the game
            await user1Page.click('button:has-text("Back to Lobby")');
            await user1Page.waitForSelector('text=Welcome to Tic-Tac-Toe Online', { timeout: 20000 });
            console.log('✅ User 1 exited game and returned to lobby');

            // User 2 exits the game
            await user2Page.click('button:has-text("Back to Lobby")');
            await user2Page.waitForSelector('text=Welcome to Tic-Tac-Toe Online', { timeout: 20000 });
            console.log('✅ User 2 exited game and returned to lobby');

            // Check if statistics are updated
            const user1Stats = await user1Page.locator('text=FinalPlayer1').isVisible();
            const user2Stats = await user2Page.locator('text=FinalPlayer2').isVisible();

            expect(user1Stats).toBeTruthy();
            expect(user2Stats).toBeTruthy();
            console.log('✅ User statistics are visible after game completion');

            // Test 9: Logout
            console.log('\n🚪 Test 9: Logout');

            // User 1 logs out
            await user1Page.click('button:has-text("Sign Out")');
            await user1Page.waitForSelector('text=Welcome Back', { timeout: 20000 });
            console.log('✅ User 1 logged out successfully');

            // User 2 logs out
            await user2Page.click('button:has-text("Sign Out")');
            await user2Page.waitForSelector('text=Welcome Back', { timeout: 20000 });
            console.log('✅ User 2 logged out successfully');

            console.log('\n🎉 Final Ably Production Test Completed Successfully!');
            console.log('✅ All real-time features working perfectly with Ably on production');
            console.log('✅ Complete game flow tested and verified');
            console.log('✅ Two players successfully played, exited, and logged out');

        } catch (error) {
            console.error('❌ Final Ably Production Test Failed:', error);

            // Take screenshots for debugging
            await user1Page.screenshot({ path: 'ably-final-prod-user1-error.png' });
            await user2Page.screenshot({ path: 'ably-final-prod-user2-error.png' });
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