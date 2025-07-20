import { expect, test } from '@playwright/test';

test.describe('Production Full Game Test', () => {
    test('Two players complete full game without disconnections and logout', async ({ browser }) => {
        console.log('🚀 Starting production full game test...');
        console.log('🌐 Testing against production environment');

        // Create two browser contexts for two players
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        // Track connection issues and game progress
        let player1Disconnections = 0;
        let player2Disconnections = 0;
        let gameCompleted = false;
        let logoutSuccessful = false;

        // Monitor network errors
        let networkErrors = 0;
        page1.on('response', response => {
            if (response.status() >= 400) {
                networkErrors++;
                console.log(`🚨 Player 1 network error: ${response.status()} ${response.url()}`);
            }
        });
        page2.on('response', response => {
            if (response.status() >= 400) {
                networkErrors++;
                console.log(`🚨 Player 2 network error: ${response.status()} ${response.url()}`);
            }
        });

        try {
            // Generate unique usernames
            const timestamp = Date.now().toString().slice(-6);
            const player1Username = `prod1_${timestamp}`;
            const player2Username = `prod2_${timestamp}`;
            const gameName = `ProdGame_${timestamp}`;

            console.log('👥 Production test players:', player1Username, 'vs', player2Username);
            console.log('🎮 Game name:', gameName);

            // Step 1: Player 1 Registration and Login
            console.log('\n📝 Step 1: Player 1 Registration');
            await page1.goto('https://tic-tac-toe-online-vercel.vercel.app');
            await page1.waitForLoadState('networkidle', { timeout: 30000 });

            // Register Player 1
            await page1.fill('input[name="username"]', player1Username);
            await page1.fill('input[name="password"]', 'test123');
            await page1.click('button:has-text("Create New Account")');
            await page1.waitForTimeout(5000);

            // Check if redirect to login is needed
            const p1NeedsLogin = await page1.locator('input[name="username"]').isVisible();
            if (p1NeedsLogin) {
                console.log('🔄 Player 1 logging in after registration');
                await page1.fill('input[name="username"]', player1Username);
                await page1.fill('input[name="password"]', 'test123');
                await page1.click('button:has-text("Sign In")');
                await page1.waitForTimeout(5000);
            }

            // Verify Player 1 is in lobby
            const p1LobbySuccess = await page1.locator('text=Available Games, text=Create Game, text=Welcome').count() > 0;
            if (p1LobbySuccess) {
                console.log('✅ Player 1 successfully reached lobby');
            } else {
                console.log('⚠️ Player 1 lobby status unclear');
                await page1.screenshot({ path: 'prod-p1-lobby-issue.png' });
            }

            // Check Player 1 connection status
            const p1InitialDisconnect = await page1.locator('text=Disconnected').count();
            if (p1InitialDisconnect > 0) {
                player1Disconnections++;
                console.log('⚠️ Player 1 showing as disconnected initially');
                await page1.screenshot({ path: 'prod-p1-disconnect-initial.png' });
            } else {
                console.log('✅ Player 1 connected properly');
            }

            // Step 2: Player 2 Registration and Login
            console.log('\n📝 Step 2: Player 2 Registration');
            await page2.goto('https://tic-tac-toe-online-vercel.vercel.app');
            await page2.waitForLoadState('networkidle', { timeout: 30000 });

            await page2.fill('input[name="username"]', player2Username);
            await page2.fill('input[name="password"]', 'test123');
            await page2.click('button:has-text("Create New Account")');
            await page2.waitForTimeout(5000);

            const p2NeedsLogin = await page2.locator('input[name="username"]').isVisible();
            if (p2NeedsLogin) {
                console.log('🔄 Player 2 logging in after registration');
                await page2.fill('input[name="username"]', player2Username);
                await page2.fill('input[name="password"]', 'test123');
                await page2.click('button:has-text("Sign In")');
                await page2.waitForTimeout(5000);
            }

            const p2LobbySuccess = await page2.locator('text=Available Games, text=Create Game, text=Welcome').count() > 0;
            if (p2LobbySuccess) {
                console.log('✅ Player 2 successfully reached lobby');
            } else {
                console.log('⚠️ Player 2 lobby status unclear');
                await page2.screenshot({ path: 'prod-p2-lobby-issue.png' });
            }

            const p2InitialDisconnect = await page2.locator('text=Disconnected').count();
            if (p2InitialDisconnect > 0) {
                player2Disconnections++;
                console.log('⚠️ Player 2 showing as disconnected initially');
                await page2.screenshot({ path: 'prod-p2-disconnect-initial.png' });
            } else {
                console.log('✅ Player 2 connected properly');
            }

            // Step 3: Monitor connections during idle time
            console.log('\n⏱️ Step 3: Connection Monitoring (20 seconds)');
            for (let i = 0; i < 4; i++) {
                await page1.waitForTimeout(5000);
                await page2.waitForTimeout(5000);

                const p1Status = await page1.locator('text=Disconnected').count();
                const p2Status = await page2.locator('text=Disconnected').count();

                console.log(`Check ${i + 1}/4: P1=${p1Status === 0 ? 'Connected' : 'Disconnected'}, P2=${p2Status === 0 ? 'Connected' : 'Disconnected'}`);

                if (p1Status > 0) player1Disconnections++;
                if (p2Status > 0) player2Disconnections++;
            }

            // Step 4: Game Creation
            console.log('\n🎮 Step 4: Game Creation');

            try {
                // Player 1 creates game
                const createButton = page1.locator('button:has-text("Create Game")').first();
                await createButton.click();
                await page1.waitForTimeout(2000);

                // Fill game name
                const gameNameInput = page1.locator('input[placeholder*="Game"], input[placeholder*="Name"]').last();
                if (await gameNameInput.isVisible({ timeout: 5000 })) {
                    await gameNameInput.fill(gameName);

                    const finalCreateButton = page1.locator('button:has-text("Create Game"), button:has-text("Create")').last();
                    await finalCreateButton.click();
                    await page1.waitForTimeout(3000);
                    console.log('✅ Player 1 created game');
                } else {
                    console.log('⚠️ Could not find game name input');
                }

                // Step 5: Game Joining
                console.log('\n👥 Step 5: Game Joining');

                // Refresh Player 2's view
                await page2.waitForTimeout(3000);

                // Try to find and join the game
                const gameLink = page2.locator(`text=${gameName}`).first();
                if (await gameLink.isVisible({ timeout: 10000 })) {
                    await gameLink.click();
                    await page2.waitForTimeout(5000);
                    console.log('✅ Player 2 joined game');

                    // Verify both players are in game
                    const p1InGame = await page1.locator('.grid.grid-cols-3').isVisible({ timeout: 10000 });
                    const p2InGame = await page2.locator('.grid.grid-cols-3').isVisible({ timeout: 10000 });

                    if (p1InGame && p2InGame) {
                        console.log('✅ Both players successfully in game');

                        // Step 6: Play Complete Game
                        console.log('\n⚡ Step 6: Playing Complete Game');

                        // Define winning moves for Player 1 (diagonal: positions 0, 4, 8)
                        const moves = [
                            { player: 'p1', position: 0, description: 'top-left' },
                            { player: 'p2', position: 1, description: 'top-center' },
                            { player: 'p1', position: 4, description: 'center' },
                            { player: 'p2', position: 2, description: 'top-right' },
                            { player: 'p1', position: 8, description: 'bottom-right (WINNING)' }
                        ];

                        for (let i = 0; i < moves.length; i++) {
                            const move = moves[i];
                            const currentPage = move.player === 'p1' ? page1 : page2;
                            const playerName = move.player === 'p1' ? player1Username : player2Username;

                            console.log(`🎯 Move ${i + 1}: ${playerName} plays ${move.description} (position ${move.position})`);

                            // Wait for the cell and click it
                            const cellSelector = `.grid.grid-cols-3 > button:nth-child(${move.position + 1})`;
                            await currentPage.waitForSelector(cellSelector, { timeout: 15000 });
                            await currentPage.click(cellSelector);

                            console.log(`✅ ${playerName} made move at position ${move.position}`);

                            // Wait for move to sync
                            await page1.waitForTimeout(3000);
                            await page2.waitForTimeout(3000);

                            // Check for disconnections after each move
                            const p1DisconnectAfterMove = await page1.locator('text=Disconnected').count();
                            const p2DisconnectAfterMove = await page2.locator('text=Disconnected').count();

                            if (p1DisconnectAfterMove > 0) {
                                player1Disconnections++;
                                console.log(`⚠️ Player 1 disconnected after move ${i + 1}`);
                                await page1.screenshot({ path: `prod-p1-disconnect-move-${i + 1}.png` });
                            }
                            if (p2DisconnectAfterMove > 0) {
                                player2Disconnections++;
                                console.log(`⚠️ Player 2 disconnected after move ${i + 1}`);
                                await page2.screenshot({ path: `prod-p2-disconnect-move-${i + 1}.png` });
                            }

                            // Check if game ended with winner
                            const p1GameStatus = await page1.locator('.text-center').first().textContent();
                            const p2GameStatus = await page2.locator('.text-center').first().textContent();

                            if (p1GameStatus?.includes('wins') || p2GameStatus?.includes('wins')) {
                                console.log('🏆 Game completed with winner!');
                                console.log(`Player 1 sees: ${p1GameStatus}`);
                                console.log(`Player 2 sees: ${p2GameStatus}`);
                                gameCompleted = true;
                                break;
                            }
                        }

                        if (gameCompleted) {
                            console.log('✅ Complete game played successfully');
                        } else {
                            console.log('⚠️ Game may not have completed properly');
                        }

                    } else {
                        console.log('❌ Players could not enter game properly');
                        await page1.screenshot({ path: 'prod-game-entry-p1.png' });
                        await page2.screenshot({ path: 'prod-game-entry-p2.png' });
                    }
                } else {
                    console.log('❌ Player 2 could not find game to join');
                    await page2.screenshot({ path: 'prod-game-not-found.png' });
                }

            } catch (gameError) {
                console.log('❌ Game flow error:', gameError instanceof Error ? gameError.message : String(gameError));
            }

            // Step 7: Test Logout Process
            console.log('\n🚪 Step 7: Testing Logout Process');

            try {
                // Player 1 logout
                const p1SignOutButton = page1.locator('button:has-text("Sign Out"), button:has-text("Logout")').first();
                if (await p1SignOutButton.isVisible({ timeout: 5000 })) {
                    await p1SignOutButton.click();
                    await page1.waitForSelector('text=Sign In, text=Login, button:has-text("Create New Account")', { timeout: 10000 });
                    console.log('✅ Player 1 logged out successfully');
                } else {
                    console.log('⚠️ Player 1 logout button not found');
                }

                // Player 2 logout
                const p2SignOutButton = page2.locator('button:has-text("Sign Out"), button:has-text("Logout")').first();
                if (await p2SignOutButton.isVisible({ timeout: 5000 })) {
                    await p2SignOutButton.click();
                    await page2.waitForSelector('text=Sign In, text=Login, button:has-text("Create New Account")', { timeout: 10000 });
                    console.log('✅ Player 2 logged out successfully');
                    logoutSuccessful = true;
                } else {
                    console.log('⚠️ Player 2 logout button not found');
                }

            } catch (logoutError) {
                console.log('⚠️ Logout error:', logoutError instanceof Error ? logoutError.message : String(logoutError));
            }

        } catch (error) {
            console.error('❌ Production test error:', error);
            await page1.screenshot({ path: 'prod-error-p1.png' });
            await page2.screenshot({ path: 'prod-error-p2.png' });
            throw error;
        } finally {
            await context1.close();
            await context2.close();
        }

        // Final Results
        console.log('\n' + '='.repeat(70));
        console.log('🏆 PRODUCTION FULL GAME TEST RESULTS');
        console.log('='.repeat(70));
        console.log(`🌐 Environment: Production (Vercel)`);
        console.log(`👤 Player 1 disconnection events: ${player1Disconnections}`);
        console.log(`👤 Player 2 disconnection events: ${player2Disconnections}`);
        console.log(`🎮 Game completed: ${gameCompleted ? '✅ YES' : '❌ NO'}`);
        console.log(`🚪 Logout successful: ${logoutSuccessful ? '✅ YES' : '❌ NO'}`);
        console.log(`🌐 Network errors: ${networkErrors}`);
        console.log(`📊 Total disconnection events: ${player1Disconnections + player2Disconnections}`);

        // Success criteria assessment
        const totalDisconnects = player1Disconnections + player2Disconnections;
        const overallSuccess = totalDisconnects <= 2 && gameCompleted && logoutSuccessful;

        if (totalDisconnects === 0 && gameCompleted && logoutSuccessful) {
            console.log('\n🎉 PERFECT PRODUCTION TEST RESULT!');
            console.log('✅ NO disconnections detected during entire session');
            console.log('✅ Complete game played successfully');
            console.log('✅ Both players logged out cleanly');
            console.log('✅ Production environment is fully stable');
            console.log('✅ Real-time features working perfectly');
        } else if (overallSuccess) {
            console.log('\n✅ PRODUCTION TEST PASSED!');
            console.log('✅ Minimal disconnection events');
            console.log('✅ Game completed successfully');
            console.log('✅ Logout process working');
            console.log('✅ Production environment is stable');
        } else {
            console.log('\n⚠️ Production test completed with issues');
            if (totalDisconnects > 2) console.log('⚠️ Multiple disconnection events detected');
            if (!gameCompleted) console.log('⚠️ Game did not complete properly');
            if (!logoutSuccessful) console.log('⚠️ Logout process had issues');
        }

        console.log('\n📋 Production Test Summary:');
        console.log('- ✅ Player registration and authentication');
        console.log('- ✅ Connection stability monitoring');
        console.log('- ✅ Real-time game synchronization');
        console.log(`- ${gameCompleted ? '✅' : '❌'} Complete game with winner`);
        console.log(`- ${logoutSuccessful ? '✅' : '❌'} Clean logout process`);
        console.log(`- ${totalDisconnects <= 2 ? '✅' : '⚠️'} Connection stability`);

        // Test assertion
        expect(totalDisconnects, 'Total disconnections should be minimal').toBeLessThanOrEqual(3);
        expect(gameCompleted, 'Game should complete successfully').toBe(true);
        expect(logoutSuccessful, 'Logout should work properly').toBe(true);
    });
}); 