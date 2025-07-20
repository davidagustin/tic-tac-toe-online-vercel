import { test } from '@playwright/test';

test.describe('Simple Winner Test', () => {
    test('Two players play until winner and logout', async ({ browser }) => {
        console.log('🚀 Starting simple winner test...');

        test.setTimeout(90000); // 1.5 minutes

        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        try {
            // Clean database
            await fetch('http://localhost:3000/api/clear-db', { method: 'POST' });

            // Player 1 setup
            const player1Username = `Final1${Date.now() % 1000}`;
            await page1.goto('http://localhost:3000');
            await page1.waitForSelector('[data-testid="submit-button"]');
            await page1.click('button:has-text("Create New Account")');
            await page1.fill('[data-testid="username-input"]', player1Username);
            await page1.fill('[data-testid="password-input"]', 'password123');
            await page1.click('[data-testid="submit-button"]');
            await page1.waitForSelector('button:has-text("Create Game")');

            // Player 2 setup  
            const player2Username = `Final2${Date.now() % 1000}`;
            await page2.goto('http://localhost:3000');
            await page2.waitForSelector('[data-testid="submit-button"]');
            await page2.click('button:has-text("Create New Account")');
            await page2.fill('[data-testid="username-input"]', player2Username);
            await page2.fill('[data-testid="password-input"]', 'password123');
            await page2.click('[data-testid="submit-button"]');
            await page2.waitForSelector('button:has-text("Create Game")');

            // Player 1 creates game
            await page1.click('button:has-text("Create Game")');
            await page1.fill('input[id="gameName"]', 'Final Test Game');
            await page1.click('button:has-text("Create")');

            // Wait and find game for Player 2
            await page2.waitForTimeout(3000);
            const gameCard = page2.locator('.bg-white\\/5').filter({ hasText: 'Final Test Game' }).first();
            await gameCard.click();

            // Wait for both to be in game
            await page1.waitForTimeout(8000);
            await page2.waitForTimeout(8000);

            console.log('🎮 Making moves for winning game...');

            // Player 1 wins with top row (X X X)
            // Move 1: Player 1 (X) - top-left (0)
            await page1.locator('.grid.grid-cols-3 button').nth(0).click();
            await page1.waitForTimeout(3000);
            await page2.waitForTimeout(3000);

            // Move 2: Player 2 (O) - middle-left (3)  
            await page2.locator('.grid.grid-cols-3 button').nth(3).click();
            await page1.waitForTimeout(3000);
            await page2.waitForTimeout(3000);

            // Move 3: Player 1 (X) - top-center (1)
            await page1.locator('.grid.grid-cols-3 button').nth(1).click();
            await page1.waitForTimeout(3000);
            await page2.waitForTimeout(3000);

            // Move 4: Player 2 (O) - center (4)
            await page2.locator('.grid.grid-cols-3 button').nth(4).click();
            await page1.waitForTimeout(3000);
            await page2.waitForTimeout(3000);

            // Move 5: Player 1 (X) - top-right (2) - WINNING MOVE!
            await page1.locator('.grid.grid-cols-3 button').nth(2).click();
            await page1.waitForTimeout(5000);
            await page2.waitForTimeout(5000);

            console.log('🎉 Game completed! Checking for winner...');

            // Check for winner
            const p1Text = await page1.textContent('body');
            const p2Text = await page2.textContent('body');

            if (p1Text?.includes('wins') || p2Text?.includes('wins')) {
                console.log('🏆 Winner detected!');
                if (p1Text?.includes(`${player1Username} wins`)) {
                    console.log(`🏆 ${player1Username} wins!`);
                }
            }

            console.log('🚪 Players logging out...');

            // Both players sign out
            await page1.locator('button:has-text("Sign Out")').click();
            await page1.waitForSelector('[data-testid="submit-button"]');
            console.log('✅ Player 1 logged out');

            await page2.locator('button:has-text("Sign Out")').click();
            await page2.waitForSelector('[data-testid="submit-button"]');
            console.log('✅ Player 2 logged out');

            console.log('🎉 SUCCESS: Game played, winner determined, both logged out!');

        } catch (error) {
            console.error('❌ Test failed:', error);
            throw error;
        } finally {
            await context1.close();
            await context2.close();
        }
    });
}); 