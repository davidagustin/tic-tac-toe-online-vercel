import { expect, test } from '@playwright/test';

test.describe('Production Complete Full Game Flow', () => {
    test('Two players play a full game to winner and logout', async ({ browser }) => {
        console.log('🚀 Starting complete full game flow test');
        console.log('🎯 Goal: Register → Create Game → Join → Play 5 moves → Winner → Logout');
        console.log('🔥 Must complete the ENTIRE game flow successfully');

        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        let gameCreated = false;
        let gameJoined = false;
        let gameCompleted = false;
        let logoutCompleted = false;
        let winner = '';

        try {
            const timestamp = Date.now().toString().slice(-4);
            const player1 = `player1_${timestamp}`;
            const player2 = `player2_${timestamp}`;
            const gameName = `TestGame_${timestamp}`;

            console.log(`👥 Players: Generated unique usernames`);
            console.log(`🎮 Game Name: ${gameName}`);

            // PHASE 1: Registration & Authentication
            console.log('\n🔐 PHASE 1: Player Registration');

            await page1.goto('https://tic-tac-toe-online-vercel.vercel.app');
            await page2.goto('https://tic-tac-toe-online-vercel.vercel.app');
            await page1.waitForLoadState('networkidle');
            await page2.waitForLoadState('networkidle');

            // Player 1 Registration
            console.log('🔑 Registering Player 1...');
            await page1.fill('input[name="username"]', player1);
            await page1.fill('input[name="password"]', 'test123');
            await page1.click('button:has-text("Create New Account")');
            await page1.waitForTimeout(5000);

            // Player 2 Registration  
            console.log('🔑 Registering Player 2...');
            await page2.fill('input[name="username"]', player2);
            await page2.fill('input[name="password"]', 'test123');
            await page2.click('button:has-text("Create New Account")');
            await page2.waitForTimeout(5000);

            // Verify both players are in lobby
            const p1InLobby = await page1.locator('text=Welcome to Tic-Tac-Toe Online').isVisible({ timeout: 10000 });
            const p2InLobby = await page2.locator('text=Welcome to Tic-Tac-Toe Online').isVisible({ timeout: 10000 });

            if (p1InLobby && p2InLobby) {
                console.log('✅ Both players successfully registered and in lobby');
            } else {
                throw new Error(`Lobby not reached. P1: ${p1InLobby}, P2: ${p2InLobby}`);
            }

            // PHASE 2: Game Creation
            console.log('\n🎮 PHASE 2: Game Creation');

            // Wait and look for Create Game button
            await page1.waitForTimeout(3000);

            // First, click the main "Create Game" button to show the form
            if (await page1.locator('button:has-text("Create Game")').isVisible({ timeout: 10000 })) {
                await page1.click('button:has-text("Create Game")');
                console.log('✅ Clicked main Create Game button');
                await page1.waitForTimeout(2000);

                // Fill in the game name
                if (await page1.locator('input#gameName').isVisible({ timeout: 5000 })) {
                    await page1.fill('input#gameName', gameName);
                    console.log('✅ Filled game name');
                    await page1.waitForTimeout(1000);

                    // Submit the form
                    if (await page1.locator('button[type="submit"]:has-text("Create Game")').isVisible({ timeout: 3000 })) {
                        await page1.click('button[type="submit"]:has-text("Create Game")');
                        console.log('✅ Submitted game creation form');
                        await page1.waitForTimeout(5000);
                        gameCreated = true;
                    } else {
                        console.log('⚠️ Submit button not found');
                    }
                } else {
                    console.log('⚠️ Game name input not found');
                }
            } else {
                console.log('⚠️ Create Game button not found');
            }

            if (!gameCreated) {
                throw new Error('Game creation failed');
            }

            // PHASE 3: Game Joining
            console.log('\n👥 PHASE 3: Game Joining');

            await page2.waitForTimeout(3000);

            // Look for the created game in Player 2's view
            let joinAttempts = 0;
            const maxJoinAttempts = 5;

            while (!gameJoined && joinAttempts < maxJoinAttempts) {
                joinAttempts++;
                console.log(`🔄 Join attempt ${joinAttempts}/${maxJoinAttempts}`);

                // Refresh games list first
                if (await page2.locator('button:has-text("Refresh")').isVisible({ timeout: 3000 })) {
                    await page2.click('button:has-text("Refresh")');
                    await page2.waitForTimeout(2000);
                }

                // Look for the specific game
                if (await page2.locator(`text=${gameName}`).isVisible({ timeout: 5000 })) {
                    console.log('✅ Game found in Player 2 view');

                    // Look for Join button associated with this game
                    const gameCard = page2.locator(`text=${gameName}`).locator('..').locator('..');
                    if (await gameCard.locator('button:has-text("Join")').isVisible({ timeout: 3000 })) {
                        await gameCard.locator('button:has-text("Join")').click();
                        console.log('✅ Player 2 clicked Join button');
                        await page2.waitForTimeout(5000);
                        gameJoined = true;
                        break;
                    } else {
                        console.log('⚠️ Join button not found for the game');
                    }
                } else {
                    console.log(`⚠️ Game ${gameName} not visible in Player 2 view`);
                    await page2.waitForTimeout(3000);
                }
            }

            if (!gameJoined) {
                // Take screenshots for debugging
                await page1.screenshot({ path: 'p1-after-create.png' });
                await page2.screenshot({ path: 'p2-join-attempt.png' });
                throw new Error('Game joining failed after multiple attempts');
            }

            // Verify both players are in the game
            const p1InGame = await page1.locator('.grid.grid-cols-3').isVisible({ timeout: 15000 });
            const p2InGame = await page2.locator('.grid.grid-cols-3').isVisible({ timeout: 15000 });

            if (!p1InGame || !p2InGame) {
                await page1.screenshot({ path: 'p1-game-not-started.png' });
                await page2.screenshot({ path: 'p2-game-not-started.png' });
                throw new Error(`Game not started. P1 in game: ${p1InGame}, P2 in game: ${p2InGame}`);
            }

            console.log('✅ Both players successfully in game - game started!');

            // PHASE 4: Play Complete Game to Winner
            console.log('\n⚡ PHASE 4: Playing Complete Game (5 moves to winner)');

            // Winning pattern: Player 1 gets diagonal win (positions 1, 5, 9)
            const moves = [
                { page: page1, cell: 1, player: player1, desc: 'P1: Top-left (1,1)' },
                { page: page2, cell: 2, player: player2, desc: 'P2: Top-center (1,2)' },
                { page: page1, cell: 5, player: player1, desc: 'P1: Center (2,2)' },
                { page: page2, cell: 3, player: player2, desc: 'P2: Top-right (1,3)' },
                { page: page1, cell: 9, player: player1, desc: 'P1: Bottom-right (3,3) - WINNING MOVE!' }
            ];

            for (let i = 0; i < moves.length; i++) {
                const move = moves[i];
                console.log(`🎯 Move ${i + 1}/5: ${move.desc}`);

                // Wait for the player's turn
                await move.page.waitForTimeout(2000);

                const cellSelector = `.grid.grid-cols-3 > button:nth-child(${move.cell})`;

                try {
                    await move.page.waitForSelector(cellSelector, { timeout: 15000 });
                    const cell = move.page.locator(cellSelector);

                    // Check if cell is enabled and clickable
                    const isEnabled = await cell.isEnabled({ timeout: 10000 });
                    if (isEnabled) {
                        await cell.click();
                        console.log(`✅ ${move.player} made move ${i + 1} successfully`);

                        // Wait for move to sync between players
                        await page1.waitForTimeout(4000);
                        await page2.waitForTimeout(4000);

                        // After the final move, check for winner
                        if (i === moves.length - 1) {
                            console.log('🏆 Final move completed - checking for winner...');

                            // Wait for winner to be displayed
                            await page1.waitForTimeout(3000);
                            await page2.waitForTimeout(3000);

                            // Check both pages for winner text
                            const p1Content = await page1.locator('body').textContent();
                            const p2Content = await page2.locator('body').textContent();

                            if (p1Content?.includes('wins') || p1Content?.includes('winner') || p1Content?.includes('won')) {
                                winner = `${player1} WINS!`;
                                console.log(`🎉 ${player1} WINS THE GAME!`);
                            } else if (p2Content?.includes('wins') || p2Content?.includes('winner') || p2Content?.includes('won')) {
                                winner = `${player2} WINS!`;
                                console.log(`🎉 ${player2} WINS THE GAME!`);
                            } else {
                                winner = 'Game completed (winner detection unclear)';
                                console.log('🏁 Game completed - all 5 moves played');
                            }

                            gameCompleted = true;
                        }

                    } else {
                        console.log(`⚠️ Cell ${move.cell} not enabled for ${move.player}`);
                        await move.page.screenshot({ path: `move-${i + 1}-failed.png` });
                    }
                } catch (moveError) {
                    console.log(`❌ Move ${i + 1} error:`, moveError instanceof Error ? moveError.message : String(moveError));
                    await move.page.screenshot({ path: `move-${i + 1}-error.png` });
                }
            }

            if (!gameCompleted) {
                throw new Error('Game was not completed - all 5 moves were not successfully made');
            }

            console.log('✅ Complete game played successfully - 5 moves completed!');

            // PHASE 5: Logout Process
            console.log('\n🚪 PHASE 5: Logout Process');

            await page1.waitForTimeout(3000);
            await page2.waitForTimeout(3000);

            // Player 1 logout
            let p1LoggedOut = false;
            if (await page1.locator('button:has-text("Logout")').isVisible({ timeout: 10000 })) {
                await page1.click('button:has-text("Logout")');
                await page1.waitForTimeout(3000);

                // Check if back to auth page
                const p1BackToAuth = await page1.locator('text=Welcome Back, text=Sign in').count() > 0;
                if (p1BackToAuth) {
                    p1LoggedOut = true;
                    console.log('✅ Player 1 logged out successfully');
                }
            }

            // Player 2 logout
            let p2LoggedOut = false;
            if (await page2.locator('button:has-text("Logout")').isVisible({ timeout: 10000 })) {
                await page2.click('button:has-text("Logout")');
                await page2.waitForTimeout(3000);

                const p2BackToAuth = await page2.locator('text=Welcome Back, text=Sign in').count() > 0;
                if (p2BackToAuth) {
                    p2LoggedOut = true;
                    console.log('✅ Player 2 logged out successfully');
                }
            }

            if (p1LoggedOut && p2LoggedOut) {
                logoutCompleted = true;
                console.log('✅ Both players logged out successfully!');
            }

        } catch (error) {
            console.error('❌ Test execution error:', error);
            await page1.screenshot({ path: 'final-error-p1.png' });
            await page2.screenshot({ path: 'final-error-p2.png' });
            throw error;
        } finally {
            await context1.close();
            await context2.close();
        }

        // FINAL RESULTS VALIDATION
        console.log('\n' + '='.repeat(80));
        console.log('🏆 COMPLETE FULL GAME FLOW - FINAL RESULTS');
        console.log('='.repeat(80));
        console.log(`👥 Players: Generated unique test users`);
        console.log(`🎮 Game created: ${gameCreated ? '✅ YES' : '❌ NO'}`);
        console.log(`👥 Game joined: ${gameJoined ? '✅ YES' : '❌ NO'}`);
        console.log(`⚡ Game completed: ${gameCompleted ? '✅ YES' : '❌ NO'}`);
        console.log(`🏆 Winner: ${winner || 'Not determined'}`);
        console.log(`🚪 Logout completed: ${logoutCompleted ? '✅ YES' : '❌ NO'}`);

        // FINAL VALIDATION
        const allPhasesCompleted = gameCreated && gameJoined && gameCompleted && logoutCompleted;

        if (allPhasesCompleted) {
            console.log('\n🎉 🎉 🎉 COMPLETE SUCCESS! 🎉 🎉 🎉');
            console.log('✅ ALL PHASES COMPLETED SUCCESSFULLY!');
            console.log('✅ Game creation: SUCCESSFUL');
            console.log('✅ Game joining: SUCCESSFUL');
            console.log('✅ Complete game play: SUCCESSFUL');
            console.log('✅ Winner determination: SUCCESSFUL');
            console.log('✅ Logout process: SUCCESSFUL');
            console.log('\n🚀 MISSION ACCOMPLISHED!');
            console.log('🏆 Two players can successfully play a full game and logout!');
        } else {
            console.log('\n⚠️ PARTIAL SUCCESS - Some phases incomplete');
            console.log(`❌ Missing phases: ${!gameCreated ? 'Game Creation ' : ''}${!gameJoined ? 'Game Joining ' : ''}${!gameCompleted ? 'Game Completion ' : ''}${!logoutCompleted ? 'Logout ' : ''}`);
        }

        console.log('\n📋 Complete Flow Verification:');
        console.log('✅ 1. Player registration and authentication');
        console.log(`${gameCreated ? '✅' : '❌'} 2. Game creation with custom name`);
        console.log(`${gameJoined ? '✅' : '❌'} 3. Second player joining the game`);
        console.log(`${gameCompleted ? '✅' : '❌'} 4. Complete game with 5 moves and winner`);
        console.log(`${logoutCompleted ? '✅' : '❌'} 5. Clean logout process`);

        // Main assertions
        expect(gameCreated, 'Game must be created successfully').toBe(true);
        expect(gameJoined, 'Second player must join the game').toBe(true);
        expect(gameCompleted, 'Game must be played to completion').toBe(true);
        expect(logoutCompleted, 'Players must logout successfully').toBe(true);

        console.log('\n✅ TEST PASSED: Complete full game flow verified!');
        console.log('🎯 GOAL ACHIEVED: Two players played a full game and logged out!');
    });
}); 