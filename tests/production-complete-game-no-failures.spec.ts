import { expect, test } from '@playwright/test';

test.describe('Production Complete Game - No Failures', () => {
    test('Complete full game from registration to winner without any failures', async ({ browser }) => {
        console.log('🚀 Starting COMPLETE game test - no failures allowed!');
        console.log('🌐 Testing against production environment');
        console.log('🎯 Goal: Complete game with winner, zero disconnections, zero failures');

        // Create two browser contexts for two players
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        // Track everything
        let player1Disconnections = 0;
        let player2Disconnections = 0;
        let gameCompleted = false;
        let winnerDeclared = false;
        let logoutSuccessful = false;
        let authenticationSuccessful = false;

        try {
            // Generate unique usernames
            const timestamp = Date.now().toString().slice(-6);
            const player1Username = `game1_${timestamp}`;
            const player2Username = `game2_${timestamp}`;
            const gameName = `CompleteGame_${timestamp}`;

            console.log('👥 Players:', player1Username, 'vs', player2Username);
            console.log('🎮 Game:', gameName);

            // STEP 1: ROBUST PLAYER 1 AUTHENTICATION
            console.log('\n📝 STEP 1: Player 1 Authentication (Robust)');

            await page1.goto('https://tic-tac-toe-online-vercel.vercel.app');
            await page1.waitForLoadState('networkidle', { timeout: 30000 });

            // Register Player 1
            console.log('🔐 Registering Player 1...');
            await page1.fill('input[name="username"]', player1Username);
            await page1.fill('input[name="password"]', 'test123');
            await page1.click('button:has-text("Create New Account")');
            await page1.waitForTimeout(5000);

            // Login Player 1 (registration doesn't auto-login)
            console.log('🔑 Logging in Player 1...');
            await page1.fill('input[name="username"]', player1Username);
            await page1.fill('input[name="password"]', 'test123');
            await page1.click('button:has-text("Sign In")');

            // Wait for authentication with multiple success indicators
            let p1AuthSuccess = false;
            for (let attempt = 0; attempt < 5; attempt++) {
                console.log(`🔍 Player 1 auth check ${attempt + 1}/5...`);
                await page1.waitForTimeout(3000);

                const indicators = await Promise.allSettled([
                    page1.waitForSelector('text=Available Games', { timeout: 5000 }),
                    page1.waitForSelector('text=Create Game', { timeout: 5000 }),
                    page1.waitForSelector('text=Dashboard', { timeout: 5000 }),
                    page1.waitForSelector('button:has-text("Sign Out")', { timeout: 5000 })
                ]);

                const hasSuccessIndicator = indicators.some(result => result.status === 'fulfilled');
                const bodyText = await page1.locator('body').textContent();
                const notOnLogin = !bodyText?.includes('Welcome Back') && !bodyText?.includes('Sign in to continue');

                if (hasSuccessIndicator && notOnLogin) {
                    p1AuthSuccess = true;
                    console.log('✅ Player 1 authenticated successfully!');
                    break;
                }

                if (attempt < 4) {
                    console.log('⚠️ Player 1 not authenticated yet, retrying login...');
                    await page1.fill('input[name="username"]', player1Username);
                    await page1.fill('input[name="password"]', 'test123');
                    await page1.click('button:has-text("Sign In")');
                }
            }

            if (!p1AuthSuccess) {
                throw new Error('Player 1 authentication failed after 5 attempts');
            }

            // STEP 2: ROBUST PLAYER 2 AUTHENTICATION
            console.log('\n📝 STEP 2: Player 2 Authentication (Robust)');

            await page2.goto('https://tic-tac-toe-online-vercel.vercel.app');
            await page2.waitForLoadState('networkidle', { timeout: 30000 });

            console.log('🔐 Registering Player 2...');
            await page2.fill('input[name="username"]', player2Username);
            await page2.fill('input[name="password"]', 'test123');
            await page2.click('button:has-text("Create New Account")');
            await page2.waitForTimeout(5000);

            console.log('🔑 Logging in Player 2...');
            await page2.fill('input[name="username"]', player2Username);
            await page2.fill('input[name="password"]', 'test123');
            await page2.click('button:has-text("Sign In")');

            let p2AuthSuccess = false;
            for (let attempt = 0; attempt < 5; attempt++) {
                console.log(`🔍 Player 2 auth check ${attempt + 1}/5...`);
                await page2.waitForTimeout(3000);

                const indicators = await Promise.allSettled([
                    page2.waitForSelector('text=Available Games', { timeout: 5000 }),
                    page2.waitForSelector('text=Create Game', { timeout: 5000 }),
                    page2.waitForSelector('text=Dashboard', { timeout: 5000 }),
                    page2.waitForSelector('button:has-text("Sign Out")', { timeout: 5000 })
                ]);

                const hasSuccessIndicator = indicators.some(result => result.status === 'fulfilled');
                const bodyText = await page2.locator('body').textContent();
                const notOnLogin = !bodyText?.includes('Welcome Back') && !bodyText?.includes('Sign in to continue');

                if (hasSuccessIndicator && notOnLogin) {
                    p2AuthSuccess = true;
                    console.log('✅ Player 2 authenticated successfully!');
                    break;
                }

                if (attempt < 4) {
                    console.log('⚠️ Player 2 not authenticated yet, retrying login...');
                    await page2.fill('input[name="username"]', player2Username);
                    await page2.fill('input[name="password"]', 'test123');
                    await page2.click('button:has-text("Sign In")');
                }
            }

            if (!p2AuthSuccess) {
                throw new Error('Player 2 authentication failed after 5 attempts');
            }

            authenticationSuccessful = true;
            console.log('🎉 Both players authenticated successfully!');

            // STEP 3: CONNECTION STABILITY CHECK
            console.log('\n⏱️ STEP 3: Connection Stability Monitoring');

            for (let i = 0; i < 5; i++) {
                await page1.waitForTimeout(3000);
                await page2.waitForTimeout(3000);

                const p1Disconnected = await page1.locator('text=Disconnected').count();
                const p2Disconnected = await page2.locator('text=Disconnected').count();

                console.log(`Check ${i + 1}/5: P1=${p1Disconnected === 0 ? 'Connected' : 'DISCONNECTED'}, P2=${p2Disconnected === 0 ? 'Connected' : 'DISCONNECTED'}`);

                if (p1Disconnected > 0) {
                    player1Disconnections++;
                    console.log('🚨 Player 1 DISCONNECTION DETECTED!');
                    await page1.screenshot({ path: `prod-p1-disconnect-check-${i + 1}.png` });
                }
                if (p2Disconnected > 0) {
                    player2Disconnections++;
                    console.log('🚨 Player 2 DISCONNECTION DETECTED!');
                    await page2.screenshot({ path: `prod-p2-disconnect-check-${i + 1}.png` });
                }
            }

            if (player1Disconnections > 0 || player2Disconnections > 0) {
                throw new Error(`Disconnections detected! P1: ${player1Disconnections}, P2: ${player2Disconnections}`);
            }

            console.log('✅ Connection stability confirmed - proceeding to game!');

            // STEP 4: ROBUST GAME CREATION
            console.log('\n🎮 STEP 4: Game Creation (Robust)');

            let gameCreated = false;
            for (let attempt = 0; attempt < 3; attempt++) {
                console.log(`🎯 Game creation attempt ${attempt + 1}/3...`);

                try {
                    // Find and click Create Game button
                    const createButton = await page1.locator('button:has-text("Create Game"), button:has-text("Create"), button:has-text("New Game")').first();

                    if (await createButton.isVisible({ timeout: 10000 })) {
                        await createButton.click();
                        console.log('✅ Clicked Create Game button');
                        await page1.waitForTimeout(3000);

                        // Find and fill game name
                        const gameNameInput = await page1.locator('input[placeholder*="Game"], input[placeholder*="Name"], input[placeholder*="game"], input[placeholder*="name"], input[type="text"]:not([name="username"]):not([name="password"])').first();

                        if (await gameNameInput.isVisible({ timeout: 5000 })) {
                            await gameNameInput.fill(gameName);
                            console.log('✅ Filled game name');

                            // Submit game creation
                            const submitButton = await page1.locator('button:has-text("Create Game"), button:has-text("Create"), button:has-text("Submit"), button[type="submit"]').first();

                            if (await submitButton.isVisible({ timeout: 5000 })) {
                                await submitButton.click();
                                console.log('✅ Submitted game creation');
                                await page1.waitForTimeout(5000);

                                // Verify game was created
                                const pageContent = await page1.locator('body').textContent();
                                if (pageContent?.includes(gameName)) {
                                    gameCreated = true;
                                    console.log('🎉 Game created successfully!');
                                    break;
                                }
                            }
                        }
                    }

                    if (!gameCreated && attempt < 2) {
                        console.log('⚠️ Game creation failed, retrying...');
                        await page1.waitForTimeout(3000);
                    }

                } catch (createError) {
                    console.log(`⚠️ Game creation attempt ${attempt + 1} failed:`, createError instanceof Error ? createError.message : String(createError));
                }
            }

            if (!gameCreated) {
                throw new Error('Game creation failed after 3 attempts');
            }

            // STEP 5: ROBUST GAME JOINING
            console.log('\n👥 STEP 5: Game Joining (Robust)');

            let gameJoined = false;
            for (let attempt = 0; attempt < 5; attempt++) {
                console.log(`🎯 Game join attempt ${attempt + 1}/5...`);

                await page2.waitForTimeout(3000);

                // Look for the game
                const gameLink = await page2.locator(`text=${gameName}`).first();

                if (await gameLink.isVisible({ timeout: 10000 })) {
                    await gameLink.click();
                    console.log('✅ Player 2 clicked on game');
                    await page2.waitForTimeout(5000);

                    // Check if both players are in game
                    const p1InGame = await page1.locator('.grid.grid-cols-3').isVisible({ timeout: 15000 });
                    const p2InGame = await page2.locator('.grid.grid-cols-3').isVisible({ timeout: 15000 });

                    if (p1InGame && p2InGame) {
                        gameJoined = true;
                        console.log('🎉 Both players successfully in game!');
                        break;
                    } else {
                        console.log(`⚠️ Game interface not loaded properly. P1: ${p1InGame}, P2: ${p2InGame}`);
                    }
                } else {
                    console.log('⚠️ Game not found, waiting and retrying...');
                }

                if (!gameJoined && attempt < 4) {
                    await page2.waitForTimeout(5000);
                }
            }

            if (!gameJoined) {
                throw new Error('Game joining failed after 5 attempts');
            }

            // STEP 6: PLAY COMPLETE GAME TO WINNER
            console.log('\n⚡ STEP 6: Playing Complete Game to Winner');

            // Define winning moves for Player 1 (diagonal: 0, 4, 8)
            const moves = [
                { player: 'p1', position: 0, description: 'top-left' },
                { player: 'p2', position: 1, description: 'top-center' },
                { player: 'p1', position: 4, description: 'center' },
                { player: 'p2', position: 2, description: 'top-right' },
                { player: 'p1', position: 8, description: 'bottom-right (WINNING MOVE!)' }
            ];

            for (let i = 0; i < moves.length; i++) {
                const move = moves[i];
                const currentPage = move.player === 'p1' ? page1 : page2;
                const currentPlayerName = move.player === 'p1' ? player1Username : player2Username;

                console.log(`🎯 Move ${i + 1}/5: ${currentPlayerName} plays ${move.description} (position ${move.position})`);

                // Wait for the cell and make the move
                const cellSelector = `.grid.grid-cols-3 > button:nth-child(${move.position + 1})`;

                let moveSuccessful = false;
                for (let attempt = 0; attempt < 3; attempt++) {
                    try {
                        await currentPage.waitForSelector(cellSelector, { timeout: 15000 });
                        const cell = currentPage.locator(cellSelector);

                        if (await cell.isEnabled({ timeout: 5000 })) {
                            await cell.click();
                            console.log(`✅ ${currentPlayerName} successfully made move at position ${move.position}`);
                            moveSuccessful = true;
                            break;
                        } else {
                            console.log(`⚠️ Cell ${move.position} not enabled, attempt ${attempt + 1}/3`);
                        }
                    } catch (moveError) {
                        console.log(`⚠️ Move attempt ${attempt + 1} failed:`, moveError instanceof Error ? moveError.message : String(moveError));
                    }

                    if (!moveSuccessful && attempt < 2) {
                        await currentPage.waitForTimeout(2000);
                    }
                }

                if (!moveSuccessful) {
                    throw new Error(`Failed to make move ${i + 1} after 3 attempts`);
                }

                // Wait for move to sync
                await page1.waitForTimeout(4000);
                await page2.waitForTimeout(4000);

                // Check for disconnections after each move
                const p1DisconnectAfterMove = await page1.locator('text=Disconnected').count();
                const p2DisconnectAfterMove = await page2.locator('text=Disconnected').count();

                if (p1DisconnectAfterMove > 0) {
                    player1Disconnections++;
                    console.log(`🚨 Player 1 DISCONNECTED after move ${i + 1}!`);
                    await page1.screenshot({ path: `prod-p1-disconnect-move-${i + 1}.png` });
                    throw new Error(`Player 1 disconnected after move ${i + 1}`);
                }
                if (p2DisconnectAfterMove > 0) {
                    player2Disconnections++;
                    console.log(`🚨 Player 2 DISCONNECTED after move ${i + 1}!`);
                    await page2.screenshot({ path: `prod-p2-disconnect-move-${i + 1}.png` });
                    throw new Error(`Player 2 disconnected after move ${i + 1}`);
                }

                // Check if game ended with winner
                const p1GameStatus = await page1.locator('.text-center, [data-testid="game-status"], .game-status').first().textContent();
                const p2GameStatus = await page2.locator('.text-center, [data-testid="game-status"], .game-status').first().textContent();

                console.log(`📊 Game status after move ${i + 1}:`);
                console.log(`   Player 1 sees: "${p1GameStatus}"`);
                console.log(`   Player 2 sees: "${p2GameStatus}"`);

                if (p1GameStatus?.includes('wins') || p2GameStatus?.includes('wins') ||
                    p1GameStatus?.includes('winner') || p2GameStatus?.includes('winner')) {
                    console.log('🏆 GAME COMPLETED WITH WINNER!');
                    gameCompleted = true;
                    winnerDeclared = true;
                    break;
                }
            }

            if (!gameCompleted || !winnerDeclared) {
                throw new Error('Game did not complete with a winner as expected');
            }

            console.log('🎉 COMPLETE GAME SUCCESSFULLY PLAYED WITH WINNER!');

            // STEP 7: CLEAN LOGOUT
            console.log('\n🚪 STEP 7: Clean Logout Process');

            // Player 1 logout
            const p1LogoutButton = await page1.locator('button:has-text("Sign Out"), button:has-text("Logout")').first();
            if (await p1LogoutButton.isVisible({ timeout: 10000 })) {
                await p1LogoutButton.click();
                const p1BackToLogin = await page1.waitForSelector('text=Sign In, text=Login, button:has-text("Create New Account")', { timeout: 15000 }).then(() => true).catch(() => false);
                if (p1BackToLogin) {
                    console.log('✅ Player 1 logged out successfully');
                } else {
                    throw new Error('Player 1 logout failed');
                }
            } else {
                throw new Error('Player 1 logout button not found');
            }

            // Player 2 logout
            const p2LogoutButton = await page2.locator('button:has-text("Sign Out"), button:has-text("Logout")').first();
            if (await p2LogoutButton.isVisible({ timeout: 10000 })) {
                await p2LogoutButton.click();
                const p2BackToLogin = await page2.waitForSelector('text=Sign In, text=Login, button:has-text("Create New Account")', { timeout: 15000 }).then(() => true).catch(() => false);
                if (p2BackToLogin) {
                    console.log('✅ Player 2 logged out successfully');
                    logoutSuccessful = true;
                } else {
                    throw new Error('Player 2 logout failed');
                }
            } else {
                throw new Error('Player 2 logout button not found');
            }

        } catch (error) {
            console.error('❌ CRITICAL FAILURE:', error);
            await page1.screenshot({ path: 'prod-failure-p1.png' });
            await page2.screenshot({ path: 'prod-failure-p2.png' });
            throw error;
        } finally {
            await context1.close();
            await context2.close();
        }

        // FINAL VALIDATION - NO FAILURES ALLOWED
        console.log('\n' + '='.repeat(80));
        console.log('🏆 COMPLETE GAME TEST RESULTS - NO FAILURES POLICY');
        console.log('='.repeat(80));
        console.log(`🌐 Environment: Production (Vercel)`);
        console.log(`🔐 Authentication: ${authenticationSuccessful ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`👤 Player 1 disconnections: ${player1Disconnections}`);
        console.log(`👤 Player 2 disconnections: ${player2Disconnections}`);
        console.log(`🎮 Game completed: ${gameCompleted ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`🏆 Winner declared: ${winnerDeclared ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`🚪 Clean logout: ${logoutSuccessful ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`📊 Total disconnections: ${player1Disconnections + player2Disconnections}`);

        // STRICT SUCCESS CRITERIA - NO FAILURES ALLOWED
        const perfectResult = (
            authenticationSuccessful &&
            player1Disconnections === 0 &&
            player2Disconnections === 0 &&
            gameCompleted &&
            winnerDeclared &&
            logoutSuccessful
        );

        if (perfectResult) {
            console.log('\n🎉 PERFECT SUCCESS! ALL CRITERIA MET!');
            console.log('✅ Complete authentication flow');
            console.log('✅ Zero disconnections throughout');
            console.log('✅ Complete game with winner');
            console.log('✅ Clean logout process');
            console.log('✅ Production environment fully functional');
            console.log('🏆 MULTIPLAYER TIC-TAC-TOE IS WORKING FLAWLESSLY!');
        } else {
            console.log('\n❌ TEST FAILED - REQUIREMENTS NOT MET');
            if (!authenticationSuccessful) console.log('❌ Authentication failed');
            if (player1Disconnections > 0) console.log('❌ Player 1 had disconnections');
            if (player2Disconnections > 0) console.log('❌ Player 2 had disconnections');
            if (!gameCompleted) console.log('❌ Game did not complete');
            if (!winnerDeclared) console.log('❌ No winner was declared');
            if (!logoutSuccessful) console.log('❌ Logout process failed');
        }

        // STRICT ASSERTIONS - ZERO TOLERANCE FOR FAILURES
        expect(authenticationSuccessful, 'Authentication must succeed').toBe(true);
        expect(player1Disconnections, 'Player 1 must have zero disconnections').toBe(0);
        expect(player2Disconnections, 'Player 2 must have zero disconnections').toBe(0);
        expect(gameCompleted, 'Game must complete successfully').toBe(true);
        expect(winnerDeclared, 'Winner must be declared').toBe(true);
        expect(logoutSuccessful, 'Logout must succeed').toBe(true);

        console.log('\n🎯 TEST PASSED: Complete game with zero failures achieved!');
    });
}); 