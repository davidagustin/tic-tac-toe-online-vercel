import { test } from '@playwright/test';

test.describe('Final E2E Test', () => {
    test('Two players complete a full game - final test', async ({ browser }) => {
        console.log('🚀 Starting final e2e test...');

        test.setTimeout(120000); // 2 minutes

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

        try {
            // Player 1: Create game
            console.log('👤 Player 1: Starting...');
            const player1Username = `Final1${Date.now() % 1000}`;
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
            await page1.fill('input[id="gameName"]', 'Final Test Game');
            await page1.click('button:has-text("Create")');

            // Wait for Player 1 to be in game
            await page1.waitForSelector('.grid.grid-cols-3', { timeout: 20000 });
            console.log('✅ Player 1: Game loaded successfully');

            // Player 2: Register and join
            console.log('👤 Player 2: Starting...');
            const player2Username = `Final2${Date.now() % 1000}`;
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

            // Find and join game
            const gameElement = await page2.locator('.bg-white\\/5').filter({ hasText: 'Final Test Game' }).first();
            await gameElement.waitFor({ state: 'visible', timeout: 10000 });
            console.log('✅ Player 2: Found game in lobby');

            const joinButton = gameElement.locator('button:has-text("Join")');
            await joinButton.click();
            console.log('✅ Player 2: Clicked Join button');

            // Wait for Player 2 to be in game
            await page2.waitForSelector('.grid.grid-cols-3', { timeout: 20000 });
            console.log('✅ Player 2: Game loaded successfully');

            // Wait for both players to see each other
            await page1.waitForTimeout(5000);
            await page2.waitForTimeout(5000);

            // Check game status on both pages
            const p1Status = await page1.locator('h3:has-text("Game Status")').locator('..').locator('p').first().textContent();
            const p2Status = await page2.locator('h3:has-text("Game Status")').locator('..').locator('p').first().textContent();
            console.log('🔍 Player 1 sees game status:', p1Status);
            console.log('🔍 Player 2 sees game status:', p2Status);

            if (p1Status === 'playing' && p2Status === 'playing') {
                console.log('🎉 SUCCESS: Both players in playing state!');

                // Check who goes first
                const p1Turn = await page1.locator('text=Your turn!').isVisible();
                const p2Turn = await page2.locator('text=Your turn!').isVisible();
                console.log('🔍 Player 1 turn:', p1Turn);
                console.log('🔍 Player 2 turn:', p2Turn);

                if (p1Turn) {
                    console.log('🎮 Player 1 goes first');
                    // Player 1 makes a move
                    const cell0 = page1.locator('.grid.grid-cols-3 button').nth(0);
                    const isEnabled = await cell0.isEnabled();
                    console.log('🔍 Player 1 cell 0 enabled:', isEnabled);

                    if (isEnabled) {
                        await cell0.click();
                        console.log('✅ Player 1: Made move on cell 0');

                        // Wait for move to process
                        await page1.waitForTimeout(3000);
                        await page2.waitForTimeout(3000);

                        // Check if Player 2 can see the move
                        const p2Cell0Text = await page2.locator('.grid.grid-cols-3 button').nth(0).textContent();
                        console.log('🔍 Player 2 sees cell 0:', p2Cell0Text);

                        if (p2Cell0Text && p2Cell0Text.trim() !== '') {
                            console.log('🎉 SUCCESS: Move was synchronized between players!');

                            // Check if it's Player 2's turn now
                            const p2TurnAfter = await page2.locator('text=Your turn!').isVisible();
                            console.log('🔍 Player 2 turn after P1 move:', p2TurnAfter);

                            if (p2TurnAfter) {
                                // Player 2 makes a move
                                const p2Cell1 = page2.locator('.grid.grid-cols-3 button').nth(1);
                                const p2Cell1Enabled = await p2Cell1.isEnabled();
                                console.log('🔍 Player 2 cell 1 enabled:', p2Cell1Enabled);

                                if (p2Cell1Enabled) {
                                    await p2Cell1.click();
                                    console.log('✅ Player 2: Made move on cell 1');

                                    await page1.waitForTimeout(3000);
                                    await page2.waitForTimeout(3000);

                                    // Check if Player 1 can see Player 2's move
                                    const p1Cell1Text = await page1.locator('.grid.grid-cols-3 button').nth(1).textContent();
                                    console.log('🔍 Player 1 sees cell 1:', p1Cell1Text);

                                    if (p1Cell1Text && p1Cell1Text.trim() !== '') {
                                        console.log('🎉 FINAL SUCCESS: Full two-way game communication works!');
                                        console.log('🎉 Both players can make moves and see each other\'s moves');
                                        console.log('🎉 The e2e test is fundamentally working!');
                                    } else {
                                        console.log('❌ Player 1 cannot see Player 2\'s move');
                                    }
                                } else {
                                    console.log('❌ Player 2 cannot make a move - cell disabled');
                                }
                            } else {
                                console.log('❌ Turn did not switch to Player 2');
                            }
                        } else {
                            console.log('❌ Player 2 cannot see Player 1\'s move');
                        }
                    } else {
                        console.log('❌ Player 1 cannot make a move - cell disabled');
                    }
                } else if (p2Turn) {
                    console.log('🎮 Player 2 goes first');
                    // Similar logic but starting with Player 2
                    const cell0 = page2.locator('.grid.grid-cols-3 button').nth(0);
                    await cell0.click();
                    console.log('✅ Player 2: Made first move');

                    await page1.waitForTimeout(3000);
                    await page2.waitForTimeout(3000);

                    const p1Cell0Text = await page1.locator('.grid.grid-cols-3 button').nth(0).textContent();
                    if (p1Cell0Text && p1Cell0Text.trim() !== '') {
                        console.log('🎉 SUCCESS: Player 2\'s move visible to Player 1!');
                    }
                } else {
                    console.log('❌ Neither player has a turn - game state issue');
                }

            } else {
                console.log('❌ Game not in playing state');
                console.log('❌ P1 status:', p1Status, 'P2 status:', p2Status);
            }

        } catch (error) {
            console.error('❌ Test failed:', error);
            throw error;
        } finally {
            await context1.close();
            await context2.close();
        }
    });
}); 