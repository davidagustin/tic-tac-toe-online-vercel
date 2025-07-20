import { test } from '@playwright/test';

test.describe('Simple Join Test', () => {
    test('Player 2 joins Player 1 game - debug navigation', async ({ browser }) => {
        console.log('🚀 Starting simple join test...');

        test.setTimeout(60000); // 60 second max

        // Clean up before test starts
        try {
            await fetch('http://localhost:3000/api/clear-db', { method: 'POST' });
            console.log('🧹 Cleaned up database before test');
        } catch (error) {
            console.log('⚠️ Could not clean database before test:', error);
        }

        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        try {
            // Player 1: Create game
            console.log('👤 Player 1: Starting...');
            const player1Username = `P1${Date.now() % 1000}`;
            await page1.goto('http://localhost:3000');
            await page1.waitForSelector('[data-testid="submit-button"]', { timeout: 10000 });
            await page1.click('button:has-text("Create New Account")');
            await page1.waitForSelector('[data-testid="username-input"]', { timeout: 5000 });
            await page1.fill('[data-testid="username-input"]', player1Username);
            await page1.fill('[data-testid="password-input"]', 'password123');
            await page1.click('[data-testid="submit-button"]');

            await page1.waitForSelector('button:has-text("Create Game")', { timeout: 10000 });
            console.log('✅ Player 1: In lobby');

            await page1.click('button:has-text("Create Game")');
            await page1.waitForSelector('input[id="gameName"]', { timeout: 5000 });
            await page1.fill('input[id="gameName"]', 'Join Test Game');
            await page1.click('button:has-text("Create")');

            // Wait for Player 1 to be in game
            await page1.waitForSelector('.grid.grid-cols-3', { timeout: 20000 });
            console.log('✅ Player 1: Game loaded successfully');

            // Player 2: Register and find game
            console.log('👤 Player 2: Starting...');
            const player2Username = `P2${Date.now() % 1000}`;
            await page2.goto('http://localhost:3000');
            await page2.waitForSelector('[data-testid="submit-button"]', { timeout: 10000 });
            await page2.click('button:has-text("Create New Account")');
            await page2.waitForSelector('[data-testid="username-input"]', { timeout: 5000 });
            await page2.fill('[data-testid="username-input"]', player2Username);
            await page2.fill('[data-testid="password-input"]', 'password123');
            await page2.click('[data-testid="submit-button"]');

            await page2.waitForSelector('button:has-text("Create Game")', { timeout: 10000 });
            console.log('✅ Player 2: In lobby');

            // Wait a bit for game to propagate
            await page2.waitForTimeout(3000);

            // Look for Player 1's game
            const gameElement = await page2.locator('.bg-white\\/5').filter({ hasText: 'Join Test Game' }).first();
            const gameVisible = await gameElement.isVisible();
            console.log('🔍 Player 2: Game visible in lobby:', gameVisible);

            if (!gameVisible) {
                console.log('❌ Player 2: Game not visible, checking all games...');
                const allGameElements = await page2.locator('.bg-white\\/5').all();
                console.log('🔍 Player 2: Found', allGameElements.length, 'game elements');

                for (let i = 0; i < allGameElements.length; i++) {
                    const gameText = await allGameElements[i].textContent();
                    console.log(`🔍 Player 2: Game ${i}:`, gameText);
                }

                throw new Error('Game not found in lobby');
            }

            // Find and click the Join button
            const joinButton = gameElement.locator('button:has-text("Join")');
            const joinButtonVisible = await joinButton.isVisible();
            console.log('🔍 Player 2: Join button visible:', joinButtonVisible);

            if (!joinButtonVisible) {
                const gameText = await gameElement.textContent();
                console.log('❌ Player 2: Join button not visible. Game text:', gameText);
                throw new Error('Join button not visible');
            }

            // Take screenshot before join
            await page2.screenshot({ path: 'test-results/before-join.png' });
            console.log('📸 Player 2: Screenshot taken before join');

            // Click join button
            await joinButton.click();
            console.log('✅ Player 2: Clicked Join button');

            // Wait a moment and take another screenshot
            await page2.waitForTimeout(2000);
            await page2.screenshot({ path: 'test-results/after-join-click.png' });
            console.log('📸 Player 2: Screenshot taken after join click');

            // Check if we're still in lobby or moved to game
            const lobbyStillVisible = await page2.locator('button:has-text("Create Game")').isVisible();
            const gameGridVisible = await page2.locator('.grid.grid-cols-3').isVisible();

            console.log('🔍 Player 2: Still in lobby:', lobbyStillVisible);
            console.log('🔍 Player 2: Game grid visible:', gameGridVisible);

            if (lobbyStillVisible) {
                console.log('❌ Player 2: Still in lobby after join click - navigation failed');

                // Check for any error messages
                const bodyText = await page2.textContent('body');
                console.log('🔍 Player 2: Page content preview:', bodyText?.substring(0, 500));

                // Check console logs
                const consoleLogs: string[] = [];
                page2.on('console', msg => {
                    if (msg.type() === 'log' || msg.type() === 'error') {
                        consoleLogs.push(`${msg.type()}: ${msg.text()}`);
                    }
                });

                await page2.waitForTimeout(3000);
                console.log('🔍 Player 2: Console logs:', consoleLogs.slice(-10)); // Last 10 logs

                throw new Error('Player 2 remained in lobby after join - navigation failed');
            }

            if (gameGridVisible) {
                console.log('🎉 SUCCESS: Player 2 successfully navigated to game!');

                // Check game status
                const gameStatus = await page2.locator('h3:has-text("Game Status")').locator('..').locator('p').first().textContent();
                console.log('🔍 Player 2: Game status:', gameStatus);

                // Take success screenshot
                await page2.screenshot({ path: 'test-results/player2-in-game.png' });
                console.log('📸 Player 2: Success screenshot taken');

                console.log('🎉 FINAL RESULT: Player 2 join navigation is working!');
            } else {
                // Wait longer and check again
                console.log('⏳ Player 2: Waiting longer for game to load...');

                try {
                    await page2.waitForSelector('.grid.grid-cols-3', { timeout: 15000 });
                    console.log('🎉 SUCCESS: Player 2 game loaded after extended wait!');
                } catch (error) {
                    console.log('❌ Player 2: Game did not load even after extended wait');

                    // Final screenshot
                    await page2.screenshot({ path: 'test-results/player2-failed-load.png' });
                    console.log('📸 Player 2: Failure screenshot taken');

                    throw new Error('Player 2 game did not load');
                }
            }

        } catch (error) {
            console.error('❌ Test failed:', error);

            // Take failure screenshots
            await page1.screenshot({ path: 'test-results/player1-failure.png' });
            await page2.screenshot({ path: 'test-results/player2-failure.png' });

            throw error;
        } finally {
            await context1.close();
            await context2.close();
        }
    });
}); 