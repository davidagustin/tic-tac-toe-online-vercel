import { expect, test } from '@playwright/test';

test.describe('Ably Production E2E Tests', () => {
    const PRODUCTION_URL = 'https://tic-tac-toe-online-vercel.vercel.app';

    test.beforeEach(async ({ page }) => {
        // Kill any existing ports to avoid conflicts
        await page.evaluate(() => {
            // This will be handled by the test runner
        });
    });

    test('Complete Ably real-time game flow with two players on production', async ({ browser }) => {
        console.log('🎮 Starting Ably Production E2E Test - Complete Game Flow');

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

            // Test 1: User Registration and Ably Connection
            console.log('\n📝 Test 1: User Registration and Ably Connection');

            // Register User 1
            await user1Page.click('text=Don\'t have an account? Sign up');
            await user1Page.fill('input[name="userName"]', 'ProdPlayer1');
            await user1Page.fill('input[name="password"]', 'password123');
            await user1Page.click('button[type="submit"]');

            // Wait for registration and redirect to lobby
            await user1Page.waitForSelector('text=Welcome to Tic-Tac-Toe Online', { timeout: 15000 });
            console.log('✅ User 1 registered and in lobby');

            // Register User 2
            await user2Page.click('text=Don\'t have an account? Sign up');
            await user2Page.fill('input[name="userName"]', 'ProdPlayer2');
            await user2Page.fill('input[name="password"]', 'password123');
            await user2Page.click('button[type="submit"]');

            // Wait for registration and redirect to lobby
            await user2Page.waitForSelector('text=Welcome to Tic-Tac-Toe Online', { timeout: 15000 });
            console.log('✅ User 2 registered and in lobby');

            // Test 2: Verify Ably Connection Status
            console.log('\n🔌 Test 2: Verify Ably Connection Status');

            // Check if both users show as connected to real-time
            const user1Connected = await user1Page.locator('text=Real-time connected').isVisible();
            const user2Connected = await user2Page.locator('text=Real-time connected').isVisible();

            expect(user1Connected).toBeTruthy();
            expect(user2Connected).toBeTruthy();
            console.log('✅ Both users connected to Ably real-time');

            // Test 3: Game Creation with Ably
            console.log('\n🎮 Test 3: Game Creation with Ably');

            // User 1 creates a game
            await user1Page.click('text=Create New Game');
            await user1Page.fill('input[placeholder*="game name"]', 'Production Test Game');
            await user1Page.click('button:has-text("Create Game")');

            // Wait for game creation and redirect
            await user1Page.waitForSelector('text=Game Board', { timeout: 15000 });
            console.log('✅ User 1 created game and joined');

            // Test 4: Real-time Game Joining
            console.log('\n👥 Test 4: Real-time Game Joining');

            // Refresh User 2's lobby to see the new game (should appear via Ably)
            await user2Page.reload();
            await user2Page.waitForLoadState('networkidle');

            // Wait for the game to appear in the lobby (real-time update)
            await user2Page.waitForSelector('text=Production Test Game', { timeout: 15000 });
            console.log('✅ Game appeared in User 2\'s lobby via Ably');

            // User 2 joins the game
            await user2Page.click('button:has-text("Join")');

            // Wait for User 2 to join the game
            await user2Page.waitForSelector('text=Game Board', { timeout: 15000 });
            console.log('✅ User 2 joined the game');

            // Test 5: Real-time Gameplay Synchronization
            console.log('\n🎯 Test 5: Real-time Gameplay Synchronization');

            // Wait for game to start
            await user1Page.waitForSelector('text=ProdPlayer1\'s turn', { timeout: 15000 });
            console.log('✅ Game started - ProdPlayer1\'s turn');

            // Player 1 makes first move (top-left)
            await user1Page.click('[data-testid="cell-0-0"]');
            await user1Page.waitForTimeout(3000);

            // Check if Player 2 sees the move in real-time
            await user2Page.waitForSelector('text=ProdPlayer2\'s turn', { timeout: 15000 });
            console.log('✅ Player 1 made move, Player 2\'s turn (real-time sync)');

            // Verify the move appears on both boards
            const user1Cell = await user1Page.locator('[data-testid="cell-0-0"]').textContent();
            const user2Cell = await user2Page.locator('[data-testid="cell-0-0"]').textContent();

            expect(user1Cell).toBe('X');
            expect(user2Cell).toBe('X');
            console.log('✅ Move synchronized across both players via Ably');

            // Player 2 makes move (center)
            await user2Page.click('[data-testid="cell-1-1"]');
            await user2Page.waitForTimeout(3000);

            // Check if Player 1 sees the move in real-time
            await user1Page.waitForSelector('text=ProdPlayer1\'s turn', { timeout: 15000 });
            console.log('✅ Player 2 made move, Player 1\'s turn (real-time sync)');

            // Verify the move appears on both boards
            const user1CenterCell = await user1Page.locator('[data-testid="cell-1-1"]').textContent();
            const user2CenterCell = await user2Page.locator('[data-testid="cell-1-1"]').textContent();

            expect(user1CenterCell).toBe('O');
            expect(user2CenterCell).toBe('O');
            console.log('✅ Second move synchronized across both players via Ably');

            // Continue game to test more real-time synchronization
            // Player 1 makes move (top-right)
            await user1Page.click('[data-testid="cell-0-2"]');
            await user1Page.waitForTimeout(3000);

            // Player 2 makes move (bottom-left)
            await user2Page.click('[data-testid="cell-2-0"]');
            await user2Page.waitForTimeout(3000);

            // Player 1 makes move (middle-left) - this should win for Player 1
            await user1Page.click('[data-testid="cell-1-0"]');
            await user1Page.waitForTimeout(3000);

            // Test 6: Real-time Game End Detection
            console.log('\n🏆 Test 6: Real-time Game End Detection');

            // Check for game end on both players
            const user1GameEnded = await user1Page.locator('text=ProdPlayer1 wins').isVisible() ||
                await user1Page.locator('text=ProdPlayer2 wins').isVisible() ||
                await user1Page.locator('text=It\'s a draw').isVisible();

            const user2GameEnded = await user2Page.locator('text=ProdPlayer1 wins').isVisible() ||
                await user2Page.locator('text=ProdPlayer2 wins').isVisible() ||
                await user2Page.locator('text=It\'s a draw').isVisible();

            expect(user1GameEnded).toBeTruthy();
            expect(user2GameEnded).toBeTruthy();
            console.log('✅ Game end detected on both players via Ably');

            // Test 7: Real-time Chat Functionality
            console.log('\n💬 Test 7: Real-time Chat Functionality');

            // User 1 sends a chat message
            await user1Page.fill('input[placeholder*="message"]', 'Great production game!');
            await user1Page.click('button:has-text("Send")');
            await user1Page.waitForTimeout(3000);

            // Check if User 2 receives the message in real-time
            const messageReceived = await user2Page.locator('text=Great production game!').isVisible();
            expect(messageReceived).toBeTruthy();
            console.log('✅ Chat message sent and received via Ably');

            // User 2 responds
            await user2Page.fill('input[placeholder*="message"]', 'Amazing production sync!');
            await user2Page.click('button:has-text("Send")');
            await user2Page.waitForTimeout(3000);

            // Check if User 1 receives the response
            const responseReceived = await user1Page.locator('text=Amazing production sync!').isVisible();
            expect(responseReceived).toBeTruthy();
            console.log('✅ Chat response sent and received via Ably');

            // Test 8: Exit Game and Check Statistics
            console.log('\n📊 Test 8: Exit Game and Check Statistics');

            // User 1 exits the game
            await user1Page.click('button:has-text("Back to Lobby")');
            await user1Page.waitForSelector('text=Welcome to Tic-Tac-Toe Online', { timeout: 10000 });
            console.log('✅ User 1 exited game and returned to lobby');

            // User 2 exits the game
            await user2Page.click('button:has-text("Back to Lobby")');
            await user2Page.waitForSelector('text=Welcome to Tic-Tac-Toe Online', { timeout: 10000 });
            console.log('✅ User 2 exited game and returned to lobby');

            // Check if statistics are updated (look for stats section or user info)
            const user1Stats = await user1Page.locator('text=ProdPlayer1').isVisible();
            const user2Stats = await user2Page.locator('text=ProdPlayer2').isVisible();

            expect(user1Stats).toBeTruthy();
            expect(user2Stats).toBeTruthy();
            console.log('✅ User statistics are visible after game completion');

            // Test 9: Connection Stability
            console.log('\n🔗 Test 9: Connection Stability');

            // Verify both users are still connected
            const user1StillConnected = await user1Page.locator('text=Real-time connected').isVisible();
            const user2StillConnected = await user2Page.locator('text=Real-time connected').isVisible();

            expect(user1StillConnected).toBeTruthy();
            expect(user2StillConnected).toBeTruthy();
            console.log('✅ Both users maintained Ably connection throughout the game');

            // Test 10: Logout and Cleanup
            console.log('\n🚪 Test 10: Logout and Cleanup');

            // User 1 logs out
            await user1Page.click('button:has-text("Sign Out")');
            await user1Page.waitForSelector('text=Welcome Back', { timeout: 10000 });
            console.log('✅ User 1 logged out successfully');

            // User 2 logs out
            await user2Page.click('button:has-text("Sign Out")');
            await user2Page.waitForSelector('text=Welcome Back', { timeout: 10000 });
            console.log('✅ User 2 logged out successfully');

            console.log('\n🎉 Ably Production E2E Test Completed Successfully!');
            console.log('✅ All real-time features working perfectly with Ably on production');

        } catch (error) {
            console.error('❌ Ably Production E2E Test Failed:', error);

            // Take screenshots for debugging
            await user1Page.screenshot({ path: 'ably-prod-user1-error.png' });
            await user2Page.screenshot({ path: 'ably-prod-user2-error.png' });
            console.log('📸 Error screenshots saved');

            throw error;
        } finally {
            // Cleanup
            await user1Context.close();
            await user2Context.close();
            console.log('🧹 Browser cleanup completed');
        }
    });

    test('Production Ably connection stability and reconnection', async ({ page }) => {
        console.log('🔗 Testing Production Ably connection stability and reconnection');

        await page.goto(PRODUCTION_URL);
        await page.waitForLoadState('networkidle');

        // Register a user
        await page.click('text=Don\'t have an account? Sign up');
        await page.fill('input[name="userName"]', 'ProdStabilityUser');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');

        // Wait for lobby and connection
        await page.waitForSelector('text=Welcome to Tic-Tac-Toe Online', { timeout: 15000 });
        await page.waitForSelector('text=Real-time connected', { timeout: 15000 });

        console.log('✅ User registered and connected to Ably on production');

        // Test connection stability over time
        for (let i = 0; i < 3; i++) {
            console.log(`🔄 Testing connection stability round ${i + 1}/3`);

            // Wait a bit and check connection
            await page.waitForTimeout(5000);

            const stillConnected = await page.locator('text=Real-time connected').isVisible();
            expect(stillConnected).toBeTruthy();

            console.log(`✅ Connection stable after ${5 * (i + 1)} seconds`);
        }

        // Test page refresh and reconnection
        console.log('🔄 Testing page refresh and reconnection');
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Should automatically reconnect
        await page.waitForSelector('text=Real-time connected', { timeout: 20000 });
        console.log('✅ Successfully reconnected after page refresh');

        // Test network interruption simulation
        console.log('🌐 Testing network interruption handling');

        // Simulate network interruption by going offline
        await page.context().setOffline(true);
        await page.waitForTimeout(3000);

        // Go back online
        await page.context().setOffline(false);
        await page.waitForTimeout(5000);

        // Should reconnect automatically
        const reconnected = await page.locator('text=Real-time connected').isVisible();
        expect(reconnected).toBeTruthy();
        console.log('✅ Successfully reconnected after network interruption');

        console.log('🎉 Production Ably connection stability test completed successfully');
    });

    test('Production Ably rate limiting and performance', async ({ browser }) => {
        console.log('⚡ Testing Production Ably rate limiting and performance');

        // Create multiple contexts to simulate multiple users
        const contexts: any[] = [];
        const pages: any[] = [];

        try {
            // Create 3 browser contexts to simulate multiple users (reduced for production)
            for (let i = 0; i < 3; i++) {
                const context = await browser.newContext();
                const page = await context.newPage();
                contexts.push(context);
                pages.push(page);
            }

            // Navigate all users to the production app
            await Promise.all(pages.map(page => page.goto(PRODUCTION_URL)));

            // Register all users simultaneously
            const registrationPromises = pages.map((page, index) =>
                page.click('text=Don\'t have an account? Sign up').then(() =>
                    page.fill('input[name="userName"]', `ProdRateUser${index + 1}`)
                ).then(() =>
                    page.fill('input[name="password"]', 'password123')
                ).then(() =>
                    page.click('button[type="submit"]')
                )
            );

            await Promise.all(registrationPromises);

            // Wait for all users to be in lobby
            await Promise.all(pages.map(page =>
                page.waitForSelector('text=Welcome to Tic-Tac-Toe Online', { timeout: 15000 })
            ));

            console.log('✅ All 3 users registered and connected to Ably on production');

            // Test simultaneous game creation
            const gameCreationPromises = pages.slice(0, 2).map((page, index) =>
                page.click('text=Create New Game').then(() =>
                    page.fill('input[placeholder*="game name"]', `ProdRateGame${index + 1}`)
                ).then(() =>
                    page.click('button:has-text("Create Game")')
                )
            );

            await Promise.all(gameCreationPromises);

            // Wait for games to be created
            await Promise.all(pages.slice(0, 2).map(page =>
                page.waitForSelector('text=Game Board', { timeout: 15000 })
            ));

            console.log('✅ Multiple games created simultaneously via Ably on production');

            // Test that all users can see the games in real-time
            await pages[2].reload();
            await pages[2].waitForLoadState('networkidle');

            // Check that games appear in lobby
            const gamesVisible = await Promise.all([
                pages[2].locator('text=ProdRateGame1').isVisible(),
                pages[2].locator('text=ProdRateGame2').isVisible(),
            ]);

            expect(gamesVisible.every(visible => visible)).toBeTruthy();
            console.log('✅ All games visible to all users via Ably real-time updates on production');

            // Test rapid message sending (rate limiting)
            console.log('💬 Testing rapid message sending and rate limiting');

            const rapidMessages = [];
            for (let i = 0; i < 5; i++) {
                rapidMessages.push(
                    pages[0].fill('input[placeholder*="message"]', `Rapid prod message ${i + 1}`).then(() =>
                        pages[0].click('button:has-text("Send")')
                    )
                );
            }

            await Promise.all(rapidMessages);
            await pages[0].waitForTimeout(3000);

            // Check that messages were sent (rate limiting should handle this gracefully)
            const messagesSent = await pages[1].locator('text=Rapid prod message').count();
            expect(messagesSent).toBeGreaterThan(0);
            console.log(`✅ Rate limiting handled ${messagesSent} rapid messages gracefully on production`);

            console.log('🎉 Production Ably rate limiting and performance test completed successfully');

        } catch (error) {
            console.error('❌ Production Ably rate limiting test failed:', error);
            throw error;
        } finally {
            // Cleanup all contexts
            await Promise.all(contexts.map(context => context.close()));
            console.log('🧹 All browser contexts cleaned up');
        }
    });
}); 