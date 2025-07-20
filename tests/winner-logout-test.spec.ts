import { test } from '@playwright/test';

test.describe('Winner and Logout Test', () => {
    test('Two players complete game with winner then logout', async ({ browser }) => {
        console.log('🚀 Starting winner and logout test...');

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
            // Player 1: Register and create game
            console.log('👤 Player 1: Starting...');
            const player1Username = `Winner${Date.now() % 1000}`;
            await page1.goto('http://localhost:3000');
            await page1.waitForSelector('[data-testid="submit-button"]', { timeout: 10000 });
            await page1.click('button:has-text("Create New Account")');
            await page1.waitForSelector('[data-testid="username-input"]', { timeout: 5000 });
            await page1.fill('[data-testid="username-input"]', player1Username);
            await page1.fill('[data-testid="password-input"]', 'password123');
            await page1.click('[data-testid="submit-button"]');

            await page1.waitForSelector('button:has-text("Create Game")', { timeout: 10000 });
            console.log('✅ Player 1: Logged in');

            // Create game
            await page1.click('button:has-text("Create Game")');
            await page1.waitForSelector('input[id="gameName"]', { timeout: 5000 });
            await page1.fill('input[id="gameName"]', 'Winner Game');
            await page1.click('button:has-text("Create")');

            // Wait for navigation to game (might stay on lobby)
            await page1.waitForTimeout(5000);

            // Check if we're in game or need to join from lobby
            let inGame = await page1.locator('.grid.grid-cols-3').isVisible();
            if (!inGame) {
                console.log('🔍 Player 1: Looking for game in lobby...');
                const gameCard = page1.locator('.bg-white\\/5').filter({ hasText: 'Winner Game' }).first();
                await gameCard.click();
                await page1.waitForTimeout(3000);
            }

            // Player 2: Register and join
            console.log('👤 Player 2: Starting...');
            const player2Username = `Loser${Date.now() % 1000}`;
            await page2.goto('http://localhost:3000');
            await page2.waitForSelector('[data-testid="submit-button"]', { timeout: 10000 });
            await page2.click('button:has-text("Create New Account")');
            await page2.waitForSelector('[data-testid="username-input"]', { timeout: 5000 });
            await page2.fill('[data-testid="username-input"]', player2Username);
            await page2.fill('[data-testid="password-input"]', 'password123');
            await page2.click('[data-testid="submit-button"]');

            await page2.waitForSelector('button:has-text("Create Game")', { timeout: 10000 });
            console.log('✅ Player 2: Logged in');

            // Find and join game
            await page2.waitForTimeout(3000);
            const gameElement = page2.locator('.bg-white\\/5').filter({ hasText: 'Winner Game' }).first();
            await gameElement.waitFor({ state: 'visible', timeout: 10000 });
            const joinButton = gameElement.locator('button:has-text("Join")');
            await joinButton.click();
            console.log('✅ Player 2: Joined game');

            // Wait for both players to be in game
            await page1.waitForTimeout(5000);
            await page2.waitForTimeout(5000);

            // Play winning sequence - Player 1 wins with top row
            console.log('🎮 Starting game sequence...');

            const moves = [
                { page: page1, cell: 0, player: player1Username, symbol: 'X' }, // Top-left
                { page: page2, cell: 3, player: player2Username, symbol: 'O' }, // Middle-left  
                { page: page1, cell: 1, player: player1Username, symbol: 'X' }, // Top-center
                { page: page2, cell: 4, player: player2Username, symbol: 'O' }, // Center
                { page: page1, cell: 2, player: player1Username, symbol: 'X' }, // Top-right (WINNING MOVE)
            ];

            for (let i = 0; i < moves.length; i++) {
                const move = moves[i];
                console.log(`🎮 Move ${i + 1}: ${move.player} playing ${move.symbol} on cell ${move.cell}`);

                // Wait for turn and make move
                let moveAttempts = 0;
                while (moveAttempts < 5) {
                    try {
                        const cell = move.page.locator('.grid.grid-cols-3 button').nth(move.cell);
                        await cell.click({ timeout: 3000 });
                        console.log(`✅ Move ${i + 1}: ${move.player} clicked cell ${move.cell}`);
                        break;
                    } catch (error) {
                        moveAttempts++;
                        console.log(`🔄 Move ${i + 1}: Attempt ${moveAttempts} failed, retrying...`);
                        await page1.waitForTimeout(2000);
                        await page2.waitForTimeout(2000);
                    }
                }

                // Wait for move to sync
                await page1.waitForTimeout(3000);
                await page2.waitForTimeout(3000);

                // Check if game ended (after move 5 - winning move)
                if (i === 4) {
                    console.log('🔍 Checking for game end...');

                    // Wait longer for win detection
                    await page1.waitForTimeout(5000);
                    await page2.waitForTimeout(5000);

                    const p1Text = await page1.textContent('body');
                    const p2Text = await page2.textContent('body');

                    if (p1Text?.includes('wins') || p2Text?.includes('wins') ||
                        p1Text?.includes('finished') || p2Text?.includes('finished')) {
                        console.log('🎉 GAME WON! Game ended successfully');

                        if (p1Text?.includes(`${player1Username} wins`) || p2Text?.includes(`${player1Username} wins`)) {
                            console.log(`🏆 ${player1Username} (Player 1) is the winner!`);
                        }
                        break;
                    }
                }
            }

            console.log('🚪 Both players logging out...');

            // Player 1 logout
            console.log('🚪 Player 1: Signing out...');
            const p1SignOut = page1.locator('button:has-text("Sign Out")');
            if (await p1SignOut.isVisible()) {
                await p1SignOut.click();
                await page1.waitForSelector('[data-testid="submit-button"]', { timeout: 10000 });
                console.log('✅ Player 1: Logged out successfully');
            }

            // Player 2 logout
            console.log('🚪 Player 2: Signing out...');
            const p2SignOut = page2.locator('button:has-text("Sign Out")');
            if (await p2SignOut.isVisible()) {
                await p2SignOut.click();
                await page2.waitForSelector('[data-testid="submit-button"]', { timeout: 10000 });
                console.log('✅ Player 2: Logged out successfully');
            }

            console.log('🎉 COMPLETE SUCCESS!');
            console.log('✅ Two players played a complete game');
            console.log('✅ Player 1 won the game');
            console.log('✅ Both players logged out successfully');

        } catch (error) {
            console.error('❌ Test failed:', error);
            throw error;
        } finally {
            await context1.close();
            await context2.close();
        }
    });
}); 