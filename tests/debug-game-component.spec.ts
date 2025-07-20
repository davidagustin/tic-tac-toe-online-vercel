import { test } from '@playwright/test';

test.describe('Debug Game Component', () => {
    test('Monitor Game component console logs and state', async ({ page }) => {
        console.log('🚀 Starting Game component debug test...');

        test.setTimeout(60000);

        // Capture console logs
        const consoleLogs: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'log' || msg.type() === 'error') {
                const logMessage = `[${msg.type().toUpperCase()}] ${msg.text()}`;
                consoleLogs.push(logMessage);
                console.log(`🔍 Browser: ${logMessage}`);
            }
        });

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

            const username = `GameDebug${Date.now() % 1000}`;
            await page.click('button:has-text("Create New Account")');
            await page.waitForSelector('[data-testid="username-input"]', { timeout: 5000 });
            await page.fill('[data-testid="username-input"]', username);
            await page.fill('[data-testid="password-input"]', 'password123');
            await page.click('[data-testid="submit-button"]');

            await page.waitForSelector('button:has-text("Create Game")', { timeout: 10000 });
            console.log('✅ User logged in to lobby');

            // Take screenshot of lobby
            await page.screenshot({ path: 'test-results/debug-01-lobby.png' });

            // Create a game
            console.log('🎮 Creating game...');
            await page.click('button:has-text("Create Game")');
            await page.waitForSelector('input[id="gameName"]', { timeout: 5000 });
            await page.fill('input[id="gameName"]', 'Game Component Debug');
            await page.click('button:has-text("Create")');

            console.log('🎮 Game creation button clicked, waiting for navigation...');

            // Wait a moment for React to process
            await page.waitForTimeout(3000);

            // Take screenshot after clicking create
            await page.screenshot({ path: 'test-results/debug-02-after-create.png' });

            // Check what's currently visible
            const isLobbyVisible = await page.locator('button:has-text("Create Game")').isVisible();
            const isGameGridVisible = await page.locator('.grid.grid-cols-3').isVisible();
            const isLoadingVisible = await page.locator('text=Loading Game').isVisible();
            const isTimeoutVisible = await page.locator('text=Connection timeout').isVisible();

            console.log('🔍 UI State Check:');
            console.log(`  - Lobby visible: ${isLobbyVisible}`);
            console.log(`  - Game grid visible: ${isGameGridVisible}`);
            console.log(`  - Loading visible: ${isLoadingVisible}`);
            console.log(`  - Timeout visible: ${isTimeoutVisible}`);

            // Check if we have the "Game:" text which indicates currentGame is set
            const gameNameText = await page.locator('text=Game:').isVisible();
            console.log(`  - Game name text visible: ${gameNameText}`);

            // Log some recent console logs
            console.log('🔍 Recent console logs:');
            consoleLogs.slice(-20).forEach(log => console.log(`   ${log}`));

            // Let's wait longer and see if anything changes
            console.log('⏳ Waiting 10 more seconds to see if anything changes...');
            await page.waitForTimeout(10000);

            // Take another screenshot
            await page.screenshot({ path: 'test-results/debug-03-after-wait.png' });

            // Check state again
            const isLobbyVisible2 = await page.locator('button:has-text("Create Game")').isVisible();
            const isGameGridVisible2 = await page.locator('.grid.grid-cols-3').isVisible();
            const isLoadingVisible2 = await page.locator('text=Loading Game').isVisible();
            const isTimeoutVisible2 = await page.locator('text=Connection timeout').isVisible();
            const gameNameText2 = await page.locator('text=Game:').isVisible();

            console.log('🔍 UI State Check After Wait:');
            console.log(`  - Lobby visible: ${isLobbyVisible2}`);
            console.log(`  - Game grid visible: ${isGameGridVisible2}`);
            console.log(`  - Loading visible: ${isLoadingVisible2}`);
            console.log(`  - Timeout visible: ${isTimeoutVisible2}`);
            console.log(`  - Game name text visible: ${gameNameText2}`);

            // Check if we can access the React state via JavaScript
            const reactState = await page.evaluate(() => {
                return {
                    url: window.location.href,
                    title: document.title,
                    hasCurrentGame: document.body.textContent?.includes('Game:') || false,
                    hasGameGrid: !!document.querySelector('.grid.grid-cols-3'),
                    hasLoading: document.body.textContent?.includes('Loading Game') || false,
                    bodyPreview: document.body.textContent?.substring(0, 500)
                };
            });

            console.log('🔍 React State Analysis:', reactState);

            // Final conclusion
            if (isGameGridVisible2) {
                console.log('🎉 SUCCESS: Game component loaded properly!');
            } else if (isLoadingVisible2) {
                console.log('❌ ISSUE: Game component stuck in loading state');
                console.log('❌ This suggests currentGame state is never being set');
            } else if (isLobbyVisible2) {
                console.log('❌ ISSUE: Navigation to game component never happened');
                console.log('❌ This suggests handleJoinGame is not being called correctly');
            } else {
                console.log('❌ ISSUE: Unknown state - component might have crashed');
            }

        } catch (error) {
            console.error('❌ Test failed:', error);
            await page.screenshot({ path: 'test-results/debug-error.png' });

            // Log final console logs
            console.log('🔍 Final console logs:');
            consoleLogs.slice(-30).forEach(log => console.log(`   ${log}`));

            throw error;
        }
    });
}); 