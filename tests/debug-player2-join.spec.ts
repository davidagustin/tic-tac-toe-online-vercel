import { test } from '@playwright/test';

test.describe('Debug Player 2 Join', () => {
    test('Debug why Player 2 join fails when Player 1 works', async ({ browser }) => {
        console.log('🚀 Starting Player 2 join debug test...');

        test.setTimeout(60000);

        // Clean up first
        try {
            await fetch('http://localhost:3000/api/clear-db', { method: 'POST' });
            console.log('🧹 Cleaned up database');
        } catch (error) {
            console.log('⚠️ Cleanup failed:', error);
        }

        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        // Capture console logs for both players
        const player1Logs: string[] = [];
        const player2Logs: string[] = [];

        page1.on('console', msg => {
            if (msg.type() === 'log' || msg.type() === 'error') {
                const log = `P1 [${msg.type().toUpperCase()}] ${msg.text()}`;
                player1Logs.push(log);
                console.log(`🔍 ${log}`);
            }
        });

        page2.on('console', msg => {
            if (msg.type() === 'log' || msg.type() === 'error') {
                const log = `P2 [${msg.type().toUpperCase()}] ${msg.text()}`;
                player2Logs.push(log);
                console.log(`🔍 ${log}`);
            }
        });

        try {
            // Player 1: Create game
            console.log('👤 Player 1: Starting...');
            const player1Username = `P1Debug${Date.now() % 1000}`;
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
            await page1.fill('input[id="gameName"]', 'Debug Join Game');
            await page1.click('button:has-text("Create")');

            // Wait for Player 1 to be in game
            await page1.waitForSelector('.grid.grid-cols-3', { timeout: 20000 });
            console.log('✅ Player 1: Game loaded successfully');

            // Get the game ID from the API
            const gamesResponse = await fetch('http://localhost:3000/api/game/list');
            const games = await gamesResponse.json();
            const gameId = games[0]?.id;
            console.log('🔍 Game ID from API:', gameId);

            // Player 2: Register and join
            console.log('👤 Player 2: Starting...');
            const player2Username = `P2Debug${Date.now() % 1000}`;
            await page2.goto('http://localhost:3000');
            await page2.waitForSelector('[data-testid="submit-button"]', { timeout: 10000 });
            await page2.click('button:has-text("Create New Account")');
            await page2.waitForSelector('[data-testid="username-input"]', { timeout: 5000 });
            await page2.fill('[data-testid="username-input"]', player2Username);
            await page2.fill('[data-testid="password-input"]', 'password123');
            await page2.click('[data-testid="submit-button"]');

            await page2.waitForSelector('button:has-text("Create Game")', { timeout: 10000 });
            console.log('✅ Player 2: In lobby');

            // Wait for game to appear
            await page2.waitForTimeout(3000);

            // Check if game is visible
            const gameElement = await page2.locator('.bg-white\\/5').filter({ hasText: 'Debug Join Game' }).first();
            const gameVisible = await gameElement.isVisible();
            console.log('🔍 Player 2: Game visible in lobby:', gameVisible);

            if (gameVisible) {
                console.log('✅ Player 2: Game found in lobby');

                // Find and click Join button
                const joinButton = gameElement.locator('button:has-text("Join")');
                const joinButtonVisible = await joinButton.isVisible();
                console.log('🔍 Player 2: Join button visible:', joinButtonVisible);

                if (joinButtonVisible) {
                    // Before clicking join, test the API directly
                    console.log('🔍 Testing join API directly first...');
                    const joinApiResponse = await fetch('http://localhost:3000/api/game/join', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            gameId: gameId,
                            userName: player2Username
                        })
                    });

                    console.log('🔍 Join API response status:', joinApiResponse.status);
                    if (joinApiResponse.ok) {
                        const joinData = await joinApiResponse.json();
                        console.log('✅ Join API succeeded:', joinData);
                    } else {
                        const joinError = await joinApiResponse.text();
                        console.log('❌ Join API failed:', joinError);
                    }

                    // Now click the Join button in the UI
                    console.log('🔍 Clicking Join button in UI...');
                    await joinButton.click();
                    console.log('✅ Player 2: Join button clicked');

                    // Monitor what happens after clicking
                    await page2.waitForTimeout(2000);

                    // Check navigation state
                    const isLobbyVisible = await page2.locator('button:has-text("Create Game")').isVisible();
                    const isGameGridVisible = await page2.locator('.grid.grid-cols-3').isVisible();
                    const isLoadingVisible = await page2.locator('text=Loading Game').isVisible();

                    console.log('🔍 Player 2 after join click:');
                    console.log(`  - Still in lobby: ${isLobbyVisible}`);
                    console.log(`  - Game grid visible: ${isGameGridVisible}`);
                    console.log(`  - Loading visible: ${isLoadingVisible}`);

                    if (isGameGridVisible) {
                        console.log('🎉 SUCCESS: Player 2 joined the game!');

                        // Check game state
                        const gameStatus = await page2.locator('h3:has-text("Game Status")').locator('..').locator('p').first().textContent();
                        console.log('🔍 Player 2 game status:', gameStatus);

                        // Check if both players are shown
                        const playersSection = await page2.locator('h3:has-text("Players")').locator('..').textContent();
                        console.log('🔍 Player 2 sees players:', playersSection);

                    } else if (isLoadingVisible) {
                        console.log('⏳ Player 2: Game is loading, waiting longer...');

                        try {
                            await page2.waitForSelector('.grid.grid-cols-3', { timeout: 15000 });
                            console.log('🎉 SUCCESS: Player 2 game loaded after extended wait!');
                        } catch (error) {
                            console.log('❌ Player 2: Game never loaded');
                            console.log('🔍 Final Player 2 logs:', player2Logs.slice(-20));
                        }

                    } else if (isLobbyVisible) {
                        console.log('❌ Player 2: Remained in lobby - navigation failed');
                        console.log('❌ This suggests handleJoinGame is not working correctly');
                    } else {
                        console.log('❌ Player 2: Unknown state');
                    }

                } else {
                    console.log('❌ Player 2: Join button not visible');
                }
            } else {
                console.log('❌ Player 2: Game not visible in lobby');

                // Check what games are shown
                const allGameElements = await page2.locator('.bg-white\\/5').all();
                console.log('🔍 Player 2: Found', allGameElements.length, 'game elements');

                for (let i = 0; i < allGameElements.length; i++) {
                    const gameText = await allGameElements[i].textContent();
                    console.log(`🔍 Player 2: Game ${i}:`, gameText);
                }
            }

        } catch (error) {
            console.error('❌ Test failed:', error);

            // Take final screenshots
            await page1.screenshot({ path: 'test-results/debug-p1-final.png' });
            await page2.screenshot({ path: 'test-results/debug-p2-final.png' });

            // Log final console logs
            console.log('🔍 Final Player 1 logs:', player1Logs.slice(-15));
            console.log('🔍 Final Player 2 logs:', player2Logs.slice(-15));

            throw error;
        } finally {
            await context1.close();
            await context2.close();
        }
    });
}); 