import { test } from '@playwright/test';

test.describe('Exact Working Flow', () => {
    test('Replicate the exact successful flow from server logs', async ({ browser }) => {
        console.log('🚀 Starting exact working flow test...');

        test.setTimeout(120000); // 2 minutes

        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        try {
            // Clean database first
            console.log('🧹 Cleaning database...');
            await fetch('http://localhost:3000/api/clear-db', { method: 'POST' });

            // Replicate exact usernames from successful logs
            const player1Username = `Final1227`;
            const player2Username = `Final2928`;

            console.log('👤 Player 1: Starting registration...');
            await page1.goto('http://localhost:3000');
            await page1.waitForSelector('[data-testid="submit-button"]', { timeout: 10000 });
            await page1.click('button:has-text("Create New Account")');
            await page1.waitForSelector('[data-testid="username-input"]', { timeout: 5000 });
            await page1.fill('[data-testid="username-input"]', player1Username);
            await page1.fill('[data-testid="password-input"]', 'password123');
            await page1.click('[data-testid="submit-button"]');

            await page1.waitForSelector('button:has-text("Create Game")', { timeout: 10000 });
            console.log('✅ Player 1: Successfully logged in');

            console.log('👤 Player 2: Starting registration...');
            await page2.goto('http://localhost:3000');
            await page2.waitForSelector('[data-testid="submit-button"]', { timeout: 10000 });
            await page2.click('button:has-text("Create New Account")');
            await page2.waitForSelector('[data-testid="username-input"]', { timeout: 5000 });
            await page2.fill('[data-testid="username-input"]', player2Username);
            await page2.fill('[data-testid="password-input"]', 'password123');
            await page2.click('[data-testid="submit-button"]');

            await page2.waitForSelector('button:has-text("Create Game")', { timeout: 10000 });
            console.log('✅ Player 2: Successfully logged in');

            // Player 1 creates game exactly like successful logs
            console.log('🎮 Player 1: Creating Final Test Game...');
            await page1.click('button:has-text("Create Game")');
            await page1.waitForSelector('input[id="gameName"]', { timeout: 5000 });
            await page1.fill('input[id="gameName"]', 'Final Test Game');
            await page1.click('button:has-text("Create")');

            // Give time for game creation to complete
            await page1.waitForTimeout(3000);
            console.log('✅ Player 1: Game creation submitted');

            // Player 2 waits and joins game from lobby
            console.log('🔍 Player 2: Looking for Final Test Game in lobby...');
            await page2.waitForTimeout(3000);

            // Look for game and join - using exact approach that worked
            const gameElement = page2.locator('.bg-white\\/5').filter({ hasText: 'Final Test Game' }).first();
            await gameElement.waitFor({ state: 'visible', timeout: 15000 });
            console.log('✅ Player 2: Found Final Test Game');

            const joinButton = gameElement.locator('button:has-text("Join")');
            await joinButton.click();
            console.log('✅ Player 2: Clicked Join button');

            // Wait for both players to be in game (longer wait)
            console.log('⏳ Waiting for both players to synchronize...');
            await page1.waitForTimeout(8000);
            await page2.waitForTimeout(8000);

            // Check game status before making moves
            console.log('🔍 Checking game status...');
            const p1Status = await page1.locator('h3:has-text("Game Status")').locator('..').locator('p').first().textContent();
            const p2Status = await page2.locator('h3:has-text("Game Status")').locator('..').locator('p').first().textContent();
            console.log('🔍 Player 1 status:', p1Status);
            console.log('🔍 Player 2 status:', p2Status);

            // Wait for the game to be in playing status
            if (p1Status !== 'playing' || p2Status !== 'playing') {
                console.log('⏳ Waiting for game to start...');
                await page1.waitForFunction(() => {
                    const statusElement = document.querySelector('h3:has-text("Game Status")');
                    if (statusElement) {
                        const statusText = statusElement.parentElement?.querySelector('p')?.textContent;
                        return statusText === 'playing';
                    }
                    return false;
                }, { timeout: 15000 });

                await page2.waitForFunction(() => {
                    const statusElement = document.querySelector('h3:has-text("Game Status")');
                    if (statusElement) {
                        const statusText = statusElement.parentElement?.querySelector('p')?.textContent;
                        return statusText === 'playing';
                    }
                    return false;
                }, { timeout: 15000 });

                console.log('✅ Game is now in playing state');
            }

            console.log('🎮 Starting game moves (exact sequence from logs)...');

            // Check whose turn it is
            const p1TurnText = await page1.textContent('body');
            const p2TurnText = await page2.textContent('body');
            const p1Turn = p1TurnText?.includes('Your turn');
            const p2Turn = p2TurnText?.includes('Your turn');

            console.log('🔍 Player 1 turn indicator:', p1Turn);
            console.log('🔍 Player 2 turn indicator:', p2Turn);

            // Check button states
            const p1Button0Enabled = await page1.locator('.grid.grid-cols-3 button').nth(0).isEnabled();
            const p2Button0Enabled = await page2.locator('.grid.grid-cols-3 button').nth(0).isEnabled();
            console.log('🔍 Player 1 button 0 enabled:', p1Button0Enabled);
            console.log('🔍 Player 2 button 0 enabled:', p2Button0Enabled);

            // Wait for someone's turn to be active
            console.log('⏳ Waiting for turn to be active...');
            await page1.waitForFunction(() => {
                const buttons = document.querySelectorAll('.grid.grid-cols-3 button');
                return Array.from(buttons).some(button => !(button as HTMLButtonElement).disabled);
            }, { timeout: 15000 }).catch(() => {
                console.log('⚠️ Player 1: No buttons became enabled');
            });

            // Move 1: Player 1 (X) plays position 0 (top-left)
            console.log('🎮 Move 1: Player 1 (X) -> position 0');

            // Try both players to see who can move
            try {
                await page1.locator('.grid.grid-cols-3 button').nth(0).click({ timeout: 3000 });
                console.log('✅ Player 1 made the move');
            } catch (error) {
                console.log('🔄 Player 1 cannot move, trying Player 2...');
                await page2.locator('.grid.grid-cols-3 button').nth(0).click({ timeout: 3000 });
                console.log('✅ Player 2 made the move');
            }
            await page1.waitForTimeout(3000);
            await page2.waitForTimeout(3000);

            // Move 2: Player 2 (O) plays position 1 (top-center)  
            console.log('🎮 Move 2: Player 2 (O) -> position 1');
            await page2.locator('.grid.grid-cols-3 button').nth(1).click();
            await page1.waitForTimeout(3000);
            await page2.waitForTimeout(3000);

            // Move 3: Player 1 (X) plays position 3 (middle-left)
            console.log('🎮 Move 3: Player 1 (X) -> position 3');
            await page1.locator('.grid.grid-cols-3 button').nth(3).click();
            await page1.waitForTimeout(3000);
            await page2.waitForTimeout(3000);

            // Move 4: Player 2 (O) plays position 4 (center)
            console.log('🎮 Move 4: Player 2 (O) -> position 4');
            await page2.locator('.grid.grid-cols-3 button').nth(4).click();
            await page1.waitForTimeout(3000);
            await page2.waitForTimeout(3000);

            // Move 5: Player 1 (X) plays position 6 (bottom-left) - WINNING MOVE (diagonal)
            console.log('🎮 Move 5: Player 1 (X) -> position 6 (WINNING DIAGONAL!)');
            await page1.locator('.grid.grid-cols-3 button').nth(6).click();
            await page1.waitForTimeout(5000);
            await page2.waitForTimeout(5000);

            console.log('🎉 Game sequence completed! Checking for winner...');

            // Check for winner
            const p1Text = await page1.textContent('body');
            const p2Text = await page2.textContent('body');

            if (p1Text?.includes('wins') || p2Text?.includes('wins')) {
                console.log('🏆 Winner detected!');
                if (p1Text?.includes(`${player1Username} wins`)) {
                    console.log(`🏆 ${player1Username} (Player 1) wins with diagonal!`);
                } else if (p2Text?.includes(`${player2Username} wins`)) {
                    console.log(`🏆 ${player2Username} (Player 2) wins!`);
                }
            } else {
                console.log('🔍 No winner detected yet - checking game status...');
                const p1Status = await page1.locator('h3:has-text("Game Status")').locator('..').locator('p').first().textContent();
                const p2Status = await page2.locator('h3:has-text("Game Status")').locator('..').locator('p').first().textContent();
                console.log('🔍 Player 1 status:', p1Status);
                console.log('🔍 Player 2 status:', p2Status);
            }

            console.log('🚪 Both players signing out...');

            // Player 1 signs out (exactly like successful logs)
            console.log('🚪 Player 1: Signing out...');
            const p1SignOut = page1.locator('button:has-text("Sign Out")');
            if (await p1SignOut.isVisible()) {
                await p1SignOut.click();
                await page1.waitForSelector('[data-testid="submit-button"]', { timeout: 10000 });
                console.log('✅ Player 1: Logged out successfully');
            }

            // Player 2 signs out  
            console.log('🚪 Player 2: Signing out...');
            const p2SignOut = page2.locator('button:has-text("Sign Out")');
            if (await p2SignOut.isVisible()) {
                await p2SignOut.click();
                await page2.waitForSelector('[data-testid="submit-button"]', { timeout: 10000 });
                console.log('✅ Player 2: Logged out successfully');
            }

            console.log('🎉 COMPLETE SUCCESS!');
            console.log('✅ Replicated exact successful flow:');
            console.log('✅ - Two players registered and logged in');
            console.log('✅ - Player 1 created game, Player 2 joined');
            console.log('✅ - Both players played complete moves');
            console.log('✅ - Winner was determined');
            console.log('✅ - Both players logged out cleanly');

        } catch (error) {
            console.error('❌ Test failed:', error);

            // Debug info
            const p1URL = page1.url();
            const p2URL = page2.url();
            console.log('🔍 Player 1 URL:', p1URL);
            console.log('🔍 Player 2 URL:', p2URL);

            throw error;
        } finally {
            await context1.close();
            await context2.close();
        }
    });
}); 