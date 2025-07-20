import { expect, test } from '@playwright/test';

test.describe('Game Flow', () => {
    test('should create and join a game', async ({ page }) => {
        await page.goto('http://localhost:3001');

        // Login
        await page.fill('input[name="userName"]', 'player1');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');

        // Wait for lobby
        await expect(page.locator('text=Welcome, player1')).toBeVisible();

        // Create a game
        await page.click('button:has-text("Create Game")');
        await expect(page.locator('text=Waiting for opponent')).toBeVisible();
    });

    test('should display game list in lobby', async ({ page }) => {
        await page.goto('http://localhost:3001');

        // Login
        await page.fill('input[name="userName"]', 'player2');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');

        // Should see available games section
        await expect(page.locator('text=Available Games')).toBeVisible();
    });
}); 