import { test } from '@playwright/test';

test.describe('Debug Join Game', () => {
    test('Debug the joinGame function call', async ({ page }) => {
        console.log('🚀 Starting debug joinGame test...');

        test.setTimeout(60000);

        // Clean up first
        try {
            await fetch('http://localhost:3000/api/clear-db', { method: 'POST' });
            console.log('🧹 Cleaned up database');
        } catch (error) {
            console.log('⚠️ Cleanup failed:', error);
        }

        try {
            // Navigate and login
            await page.goto('http://localhost:3000');
            await page.waitForSelector('[data-testid="submit-button"]', { timeout: 10000 });

            const username = `DebugUser${Date.now() % 1000}`;
            await page.click('button:has-text("Create New Account")');
            await page.waitForSelector('[data-testid="username-input"]', { timeout: 5000 });
            await page.fill('[data-testid="username-input"]', username);
            await page.fill('[data-testid="password-input"]', 'password123');
            await page.click('[data-testid="submit-button"]');

            await page.waitForSelector('button:has-text("Create Game")', { timeout: 10000 });
            console.log('✅ User logged in successfully');

            // Create a game first
            await page.click('button:has-text("Create Game")');
            await page.waitForSelector('input[id="gameName"]', { timeout: 5000 });
            await page.fill('input[id="gameName"]', 'Debug Game');
            await page.click('button:has-text("Create")');

            // Now instead of waiting for the UI to load, let's inject JavaScript to test the Pusher hook directly
            const result = await page.evaluate(async (testUsername) => {
                // Wait for React to mount and usePusher to be available
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Access the React internals (this is a hack but useful for debugging)
                // Look for the React fiber with usePusher
                const results = {
                    reactFound: false,
                    pusherFound: false,
                    gameId: null as string | null,
                    joinGameResult: null,
                    error: null as string | null,
                    currentGame: null,
                    isConnected: false
                };

                try {
                    // Check if we can access the global state debugging functions
                    if ((window as any).checkGameState) {
                        console.log('Found debug functions, checking state...');
                        (window as any).checkGameState();
                    }

                    // Try to find a React component instance with usePusher
                    const reactRoot = document.querySelector('#__next') || document.querySelector('[data-reactroot]') || document.body;

                    if (reactRoot && (reactRoot as any)._reactInternalFiber) {
                        results.reactFound = true;
                        console.log('Found React fiber');
                    }

                    // Check if Pusher is available globally
                    if ((window as any).Pusher) {
                        console.log('Pusher library available globally');
                    }

                    // Try to get game data by checking API directly
                    const gameListResponse = await fetch('/api/game/list');
                    if (gameListResponse.ok) {
                        const games = await gameListResponse.json();
                        console.log('Available games:', games);

                        if (games.length > 0) {
                            const game = games[0];
                            results.gameId = game.id;
                            console.log('Found game ID:', game.id);

                            // Try to fetch this specific game
                            const gameResponse = await fetch(`/api/games/${game.id}`);
                            console.log('Game fetch response status:', gameResponse.status);

                            if (gameResponse.ok) {
                                const gameData = await gameResponse.json();
                                console.log('Game fetch successful:', gameData);
                                results.currentGame = gameData;
                            } else {
                                const errorText = await gameResponse.text();
                                console.log('Game fetch failed:', errorText);
                                results.error = `Game fetch failed: ${gameResponse.status} - ${errorText}`;
                            }
                        }
                    }

                    return results;
                } catch (error) {
                    results.error = error instanceof Error ? error.message : String(error);
                    return results;
                }
            }, username);

            console.log('🔍 JavaScript evaluation result:', result);

            if (result.error) {
                console.log('❌ Error in evaluation:', result.error);
            }

            if (result.gameId) {
                console.log('✅ Found game ID:', result.gameId);

                if (result.currentGame) {
                    console.log('✅ Successfully fetched game data:', result.currentGame);
                    console.log('🎉 CONCLUSION: The API and game data fetching works correctly');
                    console.log('🎉 The issue must be in the React component state management or UI rendering');
                } else {
                    console.log('❌ Failed to fetch game data via API');
                    console.log('❌ CONCLUSION: The game API endpoint is not working correctly');
                }
            } else {
                console.log('❌ No games found in the list');
                console.log('❌ CONCLUSION: Game creation is not working correctly');
            }

            // Take a screenshot to see what's actually on the page
            await page.screenshot({ path: 'test-results/debug-join-game.png' });
            console.log('📸 Screenshot saved for debugging');

        } catch (error) {
            console.error('❌ Test failed:', error);
            await page.screenshot({ path: 'test-results/debug-join-game-error.png' });
            throw error;
        }
    });
}); 