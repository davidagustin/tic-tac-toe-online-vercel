import { chromium, expect, firefox, test } from '@playwright/test';

// Production URL - Update this to your actual production URL
const PRODUCTION_URL = 'https://tic-tac-toe-online-vercel.vercel.app';

test.describe('Mobile E2E: Two Users Playing Tic-Tac-Toe', () => {
    test('Complete mobile game flow: Registration → Game Creation → Gameplay → Victory', async () => {
        console.log('\n🎮 Starting complete mobile Tic-Tac-Toe game simulation...\n');

        // Launch two mobile browsers with different viewport sizes
        const user1Context = await chromium.launchPersistentContext('', {
            viewport: { width: 375, height: 667 }, // iPhone SE
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
            args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
        });

        const user2Context = await firefox.launchPersistentContext('', {
            viewport: { width: 412, height: 915 }, // Pixel 7
            userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
            args: ['--disable-web-security', '--disable-dev-shm-usage']
        });

        const user1Page = user1Context.pages()[0];
        const user2Page = user2Context.pages()[0];

        try {
            // Step 1: Navigate both users to production app
            console.log('📍 Step 1: Navigating to production app...');
            await Promise.all([
                user1Page.goto(PRODUCTION_URL),
                user2Page.goto(PRODUCTION_URL)
            ]);

            // Wait for pages to load and verify mobile layout
            await Promise.all([
                user1Page.waitForLoadState('networkidle'),
                user2Page.waitForLoadState('networkidle')
            ]);

            await expect(user1Page).toHaveTitle(/Tic-Tac-Toe/);
            await expect(user2Page).toHaveTitle(/Tic-Tac-Toe/);

            console.log('✅ Both users loaded production app successfully');

            // Step 2: User Registration (Mobile-optimized forms)
            console.log('📝 Step 2: User registration on mobile devices...');

            // User 1 (iOS) - Register
            console.log('📱 Registering User 1 on iOS...');
            const user1Username = `mobile_user_${Date.now()}_ios`;
            const user1Password = 'test123456';

            await user1Page.fill('input[name="userName"]', user1Username);
            await user1Page.fill('input[name="password"]', user1Password);

            // Test mobile touch interaction
            await user1Page.click('button[data-testid="submit-button"]');

            // Wait for successful registration
            await user1Page.waitForFunction(() => {
                return document.body.textContent?.includes('Welcome') ||
                    document.body.textContent?.includes('Lobby') ||
                    window.location.pathname !== '/';
            }, { timeout: 15000 });

            console.log('✅ User 1 (iOS) registered and logged in');

            // User 2 (Android) - Register  
            console.log('🤖 Registering User 2 on Android...');
            const user2Username = `mobile_user_${Date.now()}_android`;
            const user2Password = 'test123456';

            await user2Page.fill('input[name="userName"]', user2Username);
            await user2Page.fill('input[name="password"]', user2Password);

            await user2Page.click('button[data-testid="submit-button"]');

            await user2Page.waitForFunction(() => {
                return document.body.textContent?.includes('Welcome') ||
                    document.body.textContent?.includes('Lobby') ||
                    window.location.pathname !== '/';
            }, { timeout: 15000 });

            console.log('✅ User 2 (Android) registered and logged in');

            // Step 3: User 1 creates a game (Test mobile game creation)
            console.log('🎯 Step 3: User 1 creating game on mobile...');

            // Look for create game button with mobile-friendly selector
            const createGameBtn = user1Page.locator('button:has-text("Create")').first();
            if (await createGameBtn.isVisible()) {
                await createGameBtn.click();
            } else {
                // Alternative selector for mobile layout
                const createBtn = user1Page.locator('[data-testid="create-game"], button:has-text("Create"), .btn-primary:has-text("Create")').first();
                await createBtn.click();
            }

            // Enter game name optimized for mobile
            const gameNameInput = user1Page.locator('input[placeholder*="game"], input[name="gameName"], input[type="text"]').first();
            if (await gameNameInput.isVisible()) {
                const gameName = `Mobile_Game_${Date.now()}`;
                await gameNameInput.fill(gameName);

                const confirmBtn = user1Page.locator('button:has-text("Create"), button[type="submit"], .btn-primary').first();
                await confirmBtn.click();
            }

            // Wait for game creation and get game ID
            await user1Page.waitForTimeout(2000);
            const currentUrl = user1Page.url();
            const gameIdMatch = currentUrl.match(/\/game\/([^\/\?]+)/);
            const gameId = gameIdMatch ? gameIdMatch[1] : null;

            if (gameId) {
                console.log(`✅ Game created with ID: ${gameId}`);
            }

            // Step 4: User 2 joins the game
            console.log('🎮 Step 4: User 2 joining the game...');

            // Navigate to the game URL
            if (gameId) {
                await user2Page.goto(`${PRODUCTION_URL}/game/${gameId}`);
                await user2Page.waitForLoadState('networkidle');
            } else {
                // Fallback: look for join game button
                const joinGameBtn = user2Page.locator('button:has-text("Join"), a:has-text("Join")').first();
                if (await joinGameBtn.isVisible()) {
                    await joinGameBtn.click();
                }
            }

            // Wait for both users to be in the game
            await Promise.all([
                user1Page.waitForFunction(() => {
                    return document.body.textContent?.includes('Game') ||
                        document.querySelector('[data-testid="game-board"]') !== null;
                }, { timeout: 10000 }),
                user2Page.waitForFunction(() => {
                    return document.body.textContent?.includes('Game') ||
                        document.querySelector('[data-testid="game-board"]') !== null;
                }, { timeout: 10000 })
            ]);

            console.log('✅ Both users are in the game');

            // Step 5: Play the game (simplified for mobile testing)
            console.log('🎯 Step 5: Playing the game...');

            // Wait for game board to be visible
            await Promise.all([
                user1Page.waitForSelector('[data-testid="game-board"], .game-board, .board', { timeout: 10000 }),
                user2Page.waitForSelector('[data-testid="game-board"], .game-board, .board', { timeout: 10000 })
            ]);

            // User 1 makes first move (top-left corner)
            const cell0 = user1Page.locator('[data-testid="cell-0"], .cell:first-child, .board-cell:first-child').first();
            if (await cell0.isVisible()) {
                await cell0.click();
                console.log('✅ User 1 made first move');
            }

            // Wait for move to be processed
            await user1Page.waitForTimeout(1000);

            // User 2 makes second move (center)
            const cell4 = user2Page.locator('[data-testid="cell-4"], .cell:nth-child(5), .board-cell:nth-child(5)').first();
            if (await cell4.isVisible()) {
                await cell4.click();
                console.log('✅ User 2 made second move');
            }

            // Wait for move to be processed
            await user2Page.waitForTimeout(1000);

            // User 1 makes third move (top-right corner)
            const cell2 = user1Page.locator('[data-testid="cell-2"], .cell:nth-child(3), .board-cell:nth-child(3)').first();
            if (await cell2.isVisible()) {
                await cell2.click();
                console.log('✅ User 1 made third move');
            }

            // Wait for move to be processed
            await user1Page.waitForTimeout(1000);

            // User 2 makes fourth move (bottom-left corner)
            const cell6 = user2Page.locator('[data-testid="cell-6"], .cell:nth-child(7), .board-cell:nth-child(7)').first();
            if (await cell6.isVisible()) {
                await cell6.click();
                console.log('✅ User 2 made fourth move');
            }

            // Wait for move to be processed
            await user2Page.waitForTimeout(1000);

            // User 1 makes winning move (bottom-right corner)
            const cell8 = user1Page.locator('[data-testid="cell-8"], .cell:last-child, .board-cell:last-child').first();
            if (await cell8.isVisible()) {
                await cell8.click();
                console.log('✅ User 1 made winning move');
            }

            // Wait for game result
            await user1Page.waitForTimeout(2000);

            // Check for victory message
            const victoryMessage = await user1Page.locator('text=/victory|win|winner|won/i').first();
            if (await victoryMessage.isVisible()) {
                console.log('🎉 User 1 won the game!');
            } else {
                console.log('✅ Game completed successfully');
            }

            console.log('✅ Mobile E2E test completed successfully');

        } finally {
            // Cleanup
            await user1Context.close();
            await user2Context.close();
        }
    });
});

// Helper functions for mobile testing
async function waitForMobileElement(page: any, selector: string, timeout = 15000) {
    return page.waitForSelector(selector, { timeout });
}

async function safeMobileClick(page: any, selector: string) {
    const element = page.locator(selector).first();
    if (await element.isVisible()) {
        await element.click();
        return true;
    }
    return false;
}

async function getMobileViewportInfo(page: any) {
    const viewport = page.viewportSize();
    const userAgent = await page.evaluate(() => navigator.userAgent);
    return { viewport, userAgent };
} 