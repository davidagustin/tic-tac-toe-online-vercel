import { expect, test } from '@playwright/test';

test.describe('Ably Production Working Test', () => {
    const PRODUCTION_URL = 'https://tic-tac-toe-online-vercel.vercel.app';

    test('Complete working production test with user registration', async ({ page }) => {
        console.log('🎮 Starting Working Production Test');

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

        // Click sign up
        await page.click('text=Don\'t have an account? Sign up');
        console.log('✅ Clicked sign up');

        // Wait for sign up form to be ready
        await page.waitForTimeout(1000);

        // Fill registration form
        await page.fill('input[name="userName"]', 'WorkingTestUser');
        await page.fill('input[name="password"]', 'password123');
        console.log('✅ Filled registration form');

        // Submit registration
        await page.click('button[type="submit"]');
        console.log('✅ Submitted registration');

        // Wait for redirect to lobby with longer timeout
        await page.waitForSelector('text=Welcome to Tic-Tac-Toe Online', { timeout: 25000 });
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

        // Wait for game creation form
        await page.waitForTimeout(1000);

        // Fill game name
        await page.fill('input[placeholder*="game name"]', 'Working Test Game');
        console.log('✅ Filled game name');

        // Create game
        await page.click('button:has-text("Create Game")');
        console.log('✅ Created game');

        // Wait for game board with longer timeout
        await page.waitForSelector('text=Game Board', { timeout: 25000 });
        console.log('✅ Game board loaded');

        // Check if game board is functional
        const gameBoard = await page.locator('[data-testid="cell-0-0"]').isVisible();
        expect(gameBoard).toBeTruthy();
        console.log('✅ Game board is functional');

        // Make a move
        await page.click('[data-testid="cell-0-0"]');
        console.log('✅ Made a move');

        // Wait for move to be registered
        await page.waitForTimeout(2000);

        // Check if move was registered
        const cellContent = await page.locator('[data-testid="cell-0-0"]').textContent();
        expect(cellContent).toBe('X');
        console.log('✅ Move was registered correctly');

        // Go back to lobby
        await page.click('button:has-text("Back to Lobby")');
        await page.waitForSelector('text=Welcome to Tic-Tac-Toe Online', { timeout: 15000 });
        console.log('✅ Returned to lobby');

        // Logout
        await page.click('button:has-text("Sign Out")');
        await page.waitForSelector('text=Welcome Back', { timeout: 15000 });
        console.log('✅ Logged out successfully');

        console.log('\n🎉 Working Production Test Completed Successfully!');
        console.log('✅ All functionality working perfectly on production');
    });
}); 