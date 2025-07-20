import { expect, test } from '@playwright/test';

test.describe('Ably Production Basic Test', () => {
    const PRODUCTION_URL = 'https://tic-tac-toe-online-vercel.vercel.app';

    test('Basic production site functionality', async ({ page }) => {
        console.log('🌐 Testing basic production site functionality');

        // Navigate to production
        await page.goto(PRODUCTION_URL);
        console.log('✅ Navigated to production site');

        // Wait for page to load
        await page.waitForLoadState('networkidle');
        console.log('✅ Page loaded successfully');

        // Check if login form is visible
        const loginForm = await page.locator('text=Welcome Back').isVisible();
        expect(loginForm).toBeTruthy();
        console.log('✅ Login form is visible');

        // Check if sign up option is available
        const signUpOption = await page.locator('text=Don\'t have an account? Sign up').isVisible();
        expect(signUpOption).toBeTruthy();
        console.log('✅ Sign up option is available');

        // Click sign up
        await page.click('text=Don\'t have an account? Sign up');
        console.log('✅ Clicked sign up');

        // Fill registration form
        await page.fill('input[name="userName"]', 'BasicTestUser');
        await page.fill('input[name="password"]', 'password123');
        console.log('✅ Filled registration form');

        // Submit registration
        await page.click('button[type="submit"]');
        console.log('✅ Submitted registration');

        // Wait for redirect to lobby
        await page.waitForSelector('text=Welcome to Tic-Tac-Toe Online', { timeout: 15000 });
        console.log('✅ Successfully registered and in lobby');

        // Check if real-time connection is shown
        const realtimeStatus = await page.locator('text=Real-time connected').isVisible();
        expect(realtimeStatus).toBeTruthy();
        console.log('✅ Real-time connection is active');

        // Check if create game button is available
        const createGameButton = await page.locator('text=Create New Game').isVisible();
        expect(createGameButton).toBeTruthy();
        console.log('✅ Create game button is available');

        // Click create game
        await page.click('text=Create New Game');
        console.log('✅ Clicked create game');

        // Fill game name
        await page.fill('input[placeholder*="game name"]', 'Basic Test Game');
        console.log('✅ Filled game name');

        // Create game
        await page.click('button:has-text("Create Game")');
        console.log('✅ Created game');

        // Wait for game board
        await page.waitForSelector('text=Game Board', { timeout: 15000 });
        console.log('✅ Game board loaded');

        // Check if game board is functional
        const gameBoard = await page.locator('[data-testid="cell-0-0"]').isVisible();
        expect(gameBoard).toBeTruthy();
        console.log('✅ Game board is functional');

        // Make a move
        await page.click('[data-testid="cell-0-0"]');
        console.log('✅ Made a move');

        // Check if move was registered
        const cellContent = await page.locator('[data-testid="cell-0-0"]').textContent();
        expect(cellContent).toBe('X');
        console.log('✅ Move was registered correctly');

        // Go back to lobby
        await page.click('button:has-text("Back to Lobby")');
        await page.waitForSelector('text=Welcome to Tic-Tac-Toe Online', { timeout: 10000 });
        console.log('✅ Returned to lobby');

        // Logout
        await page.click('button:has-text("Sign Out")');
        await page.waitForSelector('text=Welcome Back', { timeout: 10000 });
        console.log('✅ Logged out successfully');

        console.log('\n🎉 Basic Production Test Completed Successfully!');
        console.log('✅ All basic functionality working on production');
    });

    test('Production site loads and responds', async ({ page }) => {
        console.log('🚀 Testing production site responsiveness');

        // Navigate to production
        await page.goto(PRODUCTION_URL);

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Check if page title is correct
        const title = await page.title();
        expect(title).toContain('Tic-Tac-Toe');
        console.log('✅ Page title is correct');

        // Check if main content is visible
        const mainContent = await page.locator('body').isVisible();
        expect(mainContent).toBeTruthy();
        console.log('✅ Main content is visible');

        // Check if no errors in console
        const errors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        // Wait a bit to catch any console errors
        await page.waitForTimeout(3000);

        if (errors.length > 0) {
            console.log('⚠️ Console errors found:', errors);
        } else {
            console.log('✅ No console errors');
        }

        console.log('🎉 Production site responsiveness test completed');
    });
}); 