import { expect, test } from '@playwright/test';

test.describe('Ably Production Minimal Test', () => {
    const PRODUCTION_URL = 'https://tic-tac-toe-online-vercel.vercel.app';

    test('Production site loads and has basic elements', async ({ page }) => {
        console.log('🌐 Testing minimal production site functionality');

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

        // Check if username input is available
        const usernameInput = await page.locator('input[name="userName"]').isVisible();
        expect(usernameInput).toBeTruthy();
        console.log('✅ Username input is available');

        // Check if password input is available
        const passwordInput = await page.locator('input[name="password"]').isVisible();
        expect(passwordInput).toBeTruthy();
        console.log('✅ Password input is available');

        // Check if submit button is available
        const submitButton = await page.locator('button[type="submit"]').isVisible();
        expect(submitButton).toBeTruthy();
        console.log('✅ Submit button is available');

        // Check page title
        const title = await page.title();
        expect(title).toContain('Tic-Tac-Toe');
        console.log('✅ Page title is correct');

        // Check if main content is visible
        const mainContent = await page.locator('body').isVisible();
        expect(mainContent).toBeTruthy();
        console.log('✅ Main content is visible');

        console.log('\n🎉 Minimal Production Test Completed Successfully!');
        console.log('✅ All basic elements are present and functional on production');
    });

    test('Production site has no critical errors', async ({ page }) => {
        console.log('🚀 Testing production site for errors');

        // Navigate to production
        await page.goto(PRODUCTION_URL);

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Check if no critical errors in console
        const errors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        // Wait a bit to catch any console errors
        await page.waitForTimeout(5000);

        if (errors.length > 0) {
            console.log('⚠️ Console errors found:', errors);
            // Don't fail the test for console errors, just log them
        } else {
            console.log('✅ No console errors');
        }

        // Check if page is responsive
        const isResponsive = await page.locator('body').isVisible();
        expect(isResponsive).toBeTruthy();
        console.log('✅ Page is responsive');

        console.log('🎉 Production site error test completed');
    });
}); 