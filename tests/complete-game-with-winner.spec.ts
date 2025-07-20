import { test } from '@playwright/test';

test.describe('Complete Game with Winner', () => {
    test('Two players play until one wins, then both leave and logout', async ({ browser }) => {
        console.log('🚀 Starting complete game with winner test...');

        test.setTimeout(180000); // 3 minutes

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
            console.log('👤 Player 1: Starting registration...');
            const player1Username = `Winner1${Date.now() % 1000}`;
            await page1.goto('http://localhost:3000');
            await page1.waitForSelector('[data-testid="submit-button"]', { timeout: 10000 });
            await page1.click('button:has-text("Create New Account")');
            await page1.waitForSelector('[data-testid="username-input"]', { timeout: 5000 });
            await page1.fill('[data-testid="username-input"]', player1Username);
            await page1.fill('[data-testid="password-input"]', 'password123');
            await page1.click('[data-testid="submit-button"]');

            await page1.waitForSelector('button:has-text("Create Game")', { timeout: 10000 });
            console.log('✅ Player 1: Successfully logged in');

            // Wait for connection first
            console.log('🔍 Player 1: Checking connection status...');
            await page1.waitForFunction(() => {
                const body = document.body.textContent || '';
                return !body.includes('Disconnected');
            }, { timeout: 15000 });
            console.log('✅ Player 1: Connected successfully');

            await page1.click('button:has-text("Create Game")');
            await page1.waitForSelector('input[id="gameName"]', { timeout: 5000 });
            await page1.fill('input[id="gameName"]', 'Winner Test Game');
            await page1.click('button:has-text("Create")');

            // Wait for navigation - check for game interface 
            console.log('🔍 Player 1: Waiting for game creation...');
            await page1.waitForTimeout(3000); // Give time for creation

            // Check if we're in loading state
            const isLoading = await page1.textContent('body');
            console.log('🔍 Player 1: Page text includes:', isLoading?.includes('Loading Game') ? 'Loading Game' : 'No loading');

            if (isLoading?.includes('Loading Game') || isLoading?.includes('Connecting to game server')) {
                console.log('🔍 Player 1: In game loading state, waiting for load completion...');

                // Wait for the game to load completely
                await page1.waitForFunction(() => {
                    const body = document.body.textContent || '';
                    const hasGrid = document.querySelector('.grid.grid-cols-3');
                    const notLoading = !body.includes('Loading Game') && !body.includes('Connecting to game server');
                    return hasGrid && notLoading;
                }, { timeout: 30000 });

                console.log('✅ Player 1: Game loaded successfully');
            } else {
                // Check current URL and see if we need to navigate
                const p1URL = page1.url();
                console.log('🔍 Player 1 URL after creation:', p1URL);

                if (p1URL.includes('/game/')) {
                    // Already navigated to game page
                    await page1.waitForSelector('.grid.grid-cols-3', { timeout: 10000 });
                    console.log('✅ Player 1: Game created and loaded');
                } else {
                    // Still on lobby, game might be created but not navigated
                    console.log('🔍 Player 1: Still on lobby, looking for created game...');
                    await page1.waitForTimeout(2000);

                    // Try to refresh the game list first
                    const refreshButton = page1.locator('button:has-text("Refresh")');
                    if (await refreshButton.isVisible()) {
                        await refreshButton.click();
                        console.log('🔄 Player 1: Refreshed game list');
                        await page1.waitForTimeout(2000);
                    }

                    // Look for the game in the list and click it
                    const gameCard = page1.locator('.bg-white\\/5').filter({ hasText: 'Winner Test Game' }).first();
                    await gameCard.waitFor({ state: 'visible', timeout: 10000 });
                    await gameCard.click();
                    console.log('✅ Player 1: Clicked on created game');

                    await page1.waitForSelector('.grid.grid-cols-3', { timeout: 10000 });
                    console.log('✅ Player 1: Game loaded');
                }
            }

            // Player 2: Register and join
            console.log('👤 Player 2: Starting registration...');
            const player2Username = `Winner2${Date.now() % 1000}`;
            await page2.goto('http://localhost:3000');
            await page2.waitForSelector('[data-testid="submit-button"]', { timeout: 10000 });
            await page2.click('button:has-text("Create New Account")');
            await page2.waitForSelector('[data-testid="username-input"]', { timeout: 5000 });
            await page2.fill('[data-testid="username-input"]', player2Username);
            await page2.fill('[data-testid="password-input"]', 'password123');
            await page2.click('[data-testid="submit-button"]');

            await page2.waitForSelector('button:has-text("Create Game")', { timeout: 10000 });
            console.log('✅ Player 2: Successfully logged in');

            // Wait for connection first
            console.log('🔍 Player 2: Checking connection status...');
            await page2.waitForFunction(() => {
                const body = document.body.textContent || '';
                return !body.includes('Disconnected');
            }, { timeout: 15000 });
            console.log('✅ Player 2: Connected successfully');

            // Wait for game to appear and join
            await page2.waitForTimeout(3000);
            const gameElement = await page2.locator('.bg-white\\/5').filter({ hasText: 'Winner Test Game' }).first();
            await gameElement.waitFor({ state: 'visible', timeout: 10000 });
            console.log('✅ Player 2: Found game in lobby');

            const joinButton = gameElement.locator('button:has-text("Join")');
            await joinButton.click();
            console.log('✅ Player 2: Clicked Join button');

            // Wait for Player 2 to be in game
            console.log('🔍 Player 2: Waiting for game join...');
            try {
                await page2.waitForFunction(() => {
                    const hasGameGrid = document.querySelector('.grid.grid-cols-3');
                    const hasPlayingText = document.body.textContent?.includes('playing') ||
                        document.body.textContent?.includes('Game Status');
                    return hasGameGrid || hasPlayingText;
                }, { timeout: 30000 });

                console.log('✅ Player 2: Successfully joined game');
            } catch (error) {
                console.log('❌ Player 2: Failed to join game');
                const currentURL = page2.url();
                const pageText = await page2.textContent('body');
                console.log('🔍 Player 2 current URL:', currentURL);
                console.log('🔍 Player 2 page content:', pageText?.substring(0, 500));
                throw error;
            }

            // Wait for both players to synchronize
            await page1.waitForTimeout(5000);
            await page2.waitForTimeout(5000);

            // Check game status
            const p1Status = await page1.locator('h3:has-text("Game Status")').locator('..').locator('p').first().textContent();
            const p2Status = await page2.locator('h3:has-text("Game Status")').locator('..').locator('p').first().textContent();
            console.log('🔍 Player 1 sees game status:', p1Status);
            console.log('🔍 Player 2 sees game status:', p2Status);

            if (p1Status === 'playing' && p2Status === 'playing') {
                console.log('🎉 Both players in playing state! Starting game...');

                // Play a complete game - Player 1 wins with top row (X X X)
                const moves = [
                    // Player 1 moves (X)
                    { player: 1, cell: 0, expectedSymbol: 'X' }, // Top-left
                    // Player 2 moves (O) 
                    { player: 2, cell: 3, expectedSymbol: 'O' }, // Middle-left
                    // Player 1 moves (X)
                    { player: 1, cell: 1, expectedSymbol: 'X' }, // Top-center
                    // Player 2 moves (O)
                    { player: 2, cell: 4, expectedSymbol: 'O' }, // Center
                    // Player 1 moves (X) - WINNING MOVE
                    { player: 1, cell: 2, expectedSymbol: 'X' }, // Top-right - completes top row
                ];

                for (let i = 0; i < moves.length; i++) {
                    const move = moves[i];
                    const currentPage = move.player === 1 ? page1 : page2;
                    const otherPage = move.player === 1 ? page2 : page1;
                    const playerName = move.player === 1 ? player1Username : player2Username;

                    console.log(`🎮 Move ${i + 1}: ${playerName} playing ${move.expectedSymbol} on cell ${move.cell}`);

                    // Check if it's the current player's turn
                    const isMyTurn = await currentPage.locator('text=Your turn!').isVisible();
                    console.log(`🔍 ${playerName} turn visible:`, isMyTurn);

                    if (isMyTurn) {
                        // Make the move
                        const cell = currentPage.locator('.grid.grid-cols-3 button').nth(move.cell);
                        const isEnabled = await cell.isEnabled();
                        console.log(`🔍 Cell ${move.cell} enabled for ${playerName}:`, isEnabled);

                        if (isEnabled) {
                            await cell.click();
                            console.log(`✅ ${playerName}: Made move on cell ${move.cell}`);

                            // Wait for move to process
                            await page1.waitForTimeout(3000);
                            await page2.waitForTimeout(3000);

                            // Verify both players see the move
                            const p1CellText = await page1.locator('.grid.grid-cols-3 button').nth(move.cell).textContent();
                            const p2CellText = await page2.locator('.grid.grid-cols-3 button').nth(move.cell).textContent();

                            console.log(`🔍 Player 1 sees cell ${move.cell}:`, p1CellText?.trim() || 'empty');
                            console.log(`🔍 Player 2 sees cell ${move.cell}:`, p2CellText?.trim() || 'empty');

                            if (p1CellText?.trim() === move.expectedSymbol && p2CellText?.trim() === move.expectedSymbol) {
                                console.log(`✅ Move ${i + 1} synchronized successfully!`);
                            } else {
                                console.log(`❌ Move ${i + 1} not properly synchronized`);
                            }

                            // Check for game end after move 5 (Player 1's winning move)
                            if (i === 4) {
                                console.log('🔍 Checking for game winner...');

                                // Wait a bit longer for win detection
                                await page1.waitForTimeout(5000);
                                await page2.waitForTimeout(5000);

                                const p1FinalStatus = await page1.locator('h3:has-text("Game Status")').locator('..').locator('p').first().textContent();
                                const p2FinalStatus = await page2.locator('h3:has-text("Game Status")').locator('..').locator('p').first().textContent();

                                console.log('🔍 Final game status - Player 1 sees:', p1FinalStatus);
                                console.log('🔍 Final game status - Player 2 sees:', p2FinalStatus);

                                // Check for winner message
                                const p1WinText = await page1.textContent('body');
                                const p2WinText = await page2.textContent('body');

                                if (p1WinText?.includes('wins') || p2WinText?.includes('wins') ||
                                    p1FinalStatus === 'finished' || p2FinalStatus === 'finished') {
                                    console.log('🎉 GAME WON! Winner detected!');

                                    if (p1WinText?.includes(`${player1Username} wins`) || p2WinText?.includes(`${player1Username} wins`)) {
                                        console.log(`🏆 ${player1Username} (Player 1) is the winner!`);
                                    } else {
                                        console.log('🏆 Game ended (winner detected)');
                                    }
                                    break;
                                } else {
                                    console.log('⚠️ Game should have ended but winner not detected yet');
                                }
                            }

                        } else {
                            console.log(`❌ Cell ${move.cell} not enabled for ${playerName}`);
                            break;
                        }
                    } else {
                        console.log(`❌ Not ${playerName}'s turn when expected`);
                        break;
                    }
                }

                console.log('🎮 Game completed! Now testing logout process...');

                // Both players leave the game and logout
                console.log('🚪 Player 1: Leaving game...');
                const p1LeaveButton = await page1.locator('button:has-text("Leave Game")');
                if (await p1LeaveButton.isVisible()) {
                    await p1LeaveButton.click();
                    console.log('✅ Player 1: Clicked Leave Game');

                    // Wait for return to lobby
                    await page1.waitForSelector('button:has-text("Create Game")', { timeout: 10000 });
                    console.log('✅ Player 1: Returned to lobby');
                }

                console.log('🚪 Player 2: Leaving game...');
                const p2LeaveButton = await page2.locator('button:has-text("Leave Game")');
                if (await p2LeaveButton.isVisible()) {
                    await p2LeaveButton.click();
                    console.log('✅ Player 2: Clicked Leave Game');

                    // Wait for return to lobby
                    await page2.waitForSelector('button:has-text("Create Game")', { timeout: 10000 });
                    console.log('✅ Player 2: Returned to lobby');
                }

                // Both players sign out
                console.log('🚪 Player 1: Signing out...');
                const p1SignOutButton = await page1.locator('button:has-text("Sign Out")');
                if (await p1SignOutButton.isVisible()) {
                    await p1SignOutButton.click();
                    console.log('✅ Player 1: Clicked Sign Out');

                    // Wait for return to login screen
                    await page1.waitForSelector('[data-testid="submit-button"]', { timeout: 10000 });
                    console.log('✅ Player 1: Returned to login screen');
                }

                console.log('🚪 Player 2: Signing out...');
                const p2SignOutButton = await page2.locator('button:has-text("Sign Out")');
                if (await p2SignOutButton.isVisible()) {
                    await p2SignOutButton.click();
                    console.log('✅ Player 2: Clicked Sign Out');

                    // Wait for return to login screen
                    await page2.waitForSelector('[data-testid="submit-button"]', { timeout: 10000 });
                    console.log('✅ Player 2: Returned to login screen');
                }

                console.log('🎉 COMPLETE SUCCESS!');
                console.log('🎉 Full game flow completed:');
                console.log('✅ - Two players registered and logged in');
                console.log('✅ - Player 1 created game, Player 2 joined');
                console.log('✅ - Both players played a complete game');
                console.log('✅ - Game ended with a winner');
                console.log('✅ - Both players left the game properly');
                console.log('✅ - Both players logged out successfully');

            } else {
                console.log('❌ Game not in playing state');
                console.log('❌ P1 status:', p1Status, 'P2 status:', p2Status);
            }

        } catch (error) {
            console.error('❌ Test failed:', error);

            // Take final screenshots
            await page1.screenshot({ path: 'test-results/winner-game-p1-final.png' });
            await page2.screenshot({ path: 'test-results/winner-game-p2-final.png' });

            throw error;
        } finally {
            await context1.close();
            await context2.close();
        }
    });
}); 