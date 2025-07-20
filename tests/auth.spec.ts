import { expect, test } from '@playwright/test';

test.describe('Authentication', () => {
    test('should allow user registration and login', async ({ page }) => {
        await page.goto('http://localhost:3001');

        // Test registration
        await page.click('button:has-text("Create New Account")');
        await page.fill('input[name="userName"]', 'testuser');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');

        // Should redirect to lobby
        await expect(page.locator('text=Welcome, testuser')).toBeVisible();
    });

    test('should handle login errors gracefully', async ({ page }) => {
        await page.goto('http://localhost:3001');

        // Try to login with empty fields
        await page.click('button[type="submit"]');
        await expect(page.locator('text=Please enter a username')).toBeVisible();
    });
}); 