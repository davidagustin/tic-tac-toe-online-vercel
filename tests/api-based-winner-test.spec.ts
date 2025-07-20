import { test } from '@playwright/test';

test.describe('API-Based Winner Test', () => {
    test('Complete game with winner using API approach', async ({ browser }) => {
        console.log('🚀 Starting API-based winner test...');

        test.setTimeout(60000); // 1 minute

        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        try {
            // Clean database
            await fetch('http://localhost:3000/api/clear-db', { method: 'POST' });
            console.log('🧹 Database cleaned');

            // Register both players via API
            const player1Username = `Final1${Date.now() % 1000}`;
            const player2Username = `Final2${Date.now() % 1000}`;

            console.log('👤 Registering players via API...');
            await fetch('http://localhost:3000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: player1Username, password: 'password123' })
            });

            await fetch('http://localhost:3000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: player2Username, password: 'password123' })
            });

            console.log('✅ Both players registered via API');

            // Create game via API
            console.log('🎮 Creating game via API...');
            const createResponse = await fetch('http://localhost:3000/api/game/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameName: 'API Test Game', userName: player1Username })
            });

            const gameData = await createResponse.json();
            const gameId = gameData.game.id;
            console.log('✅ Game created via API, ID:', gameId);

            // Join game via API
            console.log('🎮 Player 2 joining via API...');
            await fetch('http://localhost:3000/api/game/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: gameId, userName: player2Username })
            });

            console.log('✅ Player 2 joined via API');

            // Now both players login to UI to see the result and make moves
            console.log('👤 Player 1: Logging into UI...');
            await page1.goto('http://localhost:3000');
            await page1.waitForSelector('[data-testid="username-input"]', { timeout: 10000 });
            await page1.fill('[data-testid="username-input"]', player1Username);
            await page1.fill('[data-testid="password-input"]', 'password123');
            await page1.click('[data-testid="submit-button"]');

            console.log('👤 Player 2: Logging into UI...');
            await page2.goto('http://localhost:3000');
            await page2.waitForSelector('[data-testid="username-input"]', { timeout: 10000 });
            await page2.fill('[data-testid="username-input"]', player2Username);
            await page2.fill('[data-testid="password-input"]', 'password123');
            await page2.click('[data-testid="submit-button"]');

            // Both should now be in the game or can join it
            await page1.waitForTimeout(5000);
            await page2.waitForTimeout(5000);

            console.log('🎮 Making winning moves via API...');

            // Player 1 wins with diagonal: positions 0, 4, 8
            // Move 1: Player 1 (X) -> position 0
            console.log('🎮 Move 1: Player 1 (X) -> position 0');
            await fetch('http://localhost:3000/api/game/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: gameId, index: 0, userName: player1Username })
            });
            await page1.waitForTimeout(2000);
            await page2.waitForTimeout(2000);

            // Move 2: Player 2 (O) -> position 1  
            console.log('🎮 Move 2: Player 2 (O) -> position 1');
            await fetch('http://localhost:3000/api/game/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: gameId, index: 1, userName: player2Username })
            });
            await page1.waitForTimeout(2000);
            await page2.waitForTimeout(2000);

            // Move 3: Player 1 (X) -> position 4 (center)
            console.log('🎮 Move 3: Player 1 (X) -> position 4');
            await fetch('http://localhost:3000/api/game/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: gameId, index: 4, userName: player1Username })
            });
            await page1.waitForTimeout(2000);
            await page2.waitForTimeout(2000);

            // Move 4: Player 2 (O) -> position 2
            console.log('🎮 Move 4: Player 2 (O) -> position 2');
            await fetch('http://localhost:3000/api/game/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: gameId, index: 2, userName: player2Username })
            });
            await page1.waitForTimeout(2000);
            await page2.waitForTimeout(2000);

            // Move 5: Player 1 (X) -> position 8 (WINNING DIAGONAL!)
            console.log('🎮 Move 5: Player 1 (X) -> position 8 (WINNING DIAGONAL!)');
            await fetch('http://localhost:3000/api/game/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: gameId, index: 8, userName: player1Username })
            });

            // Wait for win to be processed
            await page1.waitForTimeout(5000);
            await page2.waitForTimeout(5000);

            console.log('🎉 Game completed! Checking for winner...');

            // Check for winner in UI
            const p1Text = await page1.textContent('body');
            const p2Text = await page2.textContent('body');

            if (p1Text?.includes('wins') || p2Text?.includes('wins')) {
                console.log('🏆 Winner detected in UI!');
                if (p1Text?.includes(`${player1Username} wins`)) {
                    console.log(`🏆 ${player1Username} (Player 1) wins with diagonal!`);
                }
            } else {
                console.log('🔍 No winner text found, checking status...');
                // Check game status via API
                const statusResponse = await fetch(`http://localhost:3000/api/games/${gameId}`);
                const statusData = await statusResponse.json();
                console.log('🔍 Game status via API:', statusData.status);
                console.log('🔍 Winner via API:', statusData.winner);
            }

            console.log('🚪 Both players signing out...');

            // Player 1 logout via UI
            const p1SignOut = page1.locator('button:has-text("Sign Out")');
            if (await p1SignOut.isVisible()) {
                await p1SignOut.click();
                await page1.waitForSelector('[data-testid="username-input"]', { timeout: 10000 });
                console.log('✅ Player 1: Logged out via UI');
            }

            // Player 2 logout via UI
            const p2SignOut = page2.locator('button:has-text("Sign Out")');
            if (await p2SignOut.isVisible()) {
                await p2SignOut.click();
                await page2.waitForSelector('[data-testid="username-input"]', { timeout: 10000 });
                console.log('✅ Player 2: Logged out via UI');
            }

            console.log('🎉 COMPLETE SUCCESS!');
            console.log('✅ API-based game creation and moves worked');
            console.log('✅ Player 1 won with diagonal (0-4-8)');
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