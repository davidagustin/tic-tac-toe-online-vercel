import { test } from '@playwright/test';

test.describe('Connection Debug Test', () => {
    test('Debug what happens on login and check connection status', async ({ page }) => {
        console.log('🔍 Starting connection debug test...');

        try {
            // Go to localhost
            console.log('📖 Loading page...');
            await page.goto('http://localhost:3000');

            // Take initial screenshot
            await page.screenshot({ path: 'debug-initial-load.png' });
            console.log('📸 Initial screenshot taken');

            // Wait a bit for any dynamic content
            await page.waitForTimeout(3000);

            // Get page title and content
            const title = await page.title();
            console.log('📄 Page title:', title);

            // Check what's visible on the page
            const bodyText = await page.locator('body').textContent();
            console.log('📝 Page contains:', bodyText?.slice(0, 200) + '...');

            // Look for input fields
            const inputs = await page.locator('input').count();
            console.log('🔤 Input fields found:', inputs);

            if (inputs > 0) {
                // Try to get input types and placeholders
                const inputTypes = await page.locator('input').evaluateAll(inputs =>
                    inputs.map(input => ({
                        type: (input as HTMLInputElement).type,
                        placeholder: (input as HTMLInputElement).placeholder,
                        name: (input as HTMLInputElement).name
                    }))
                );
                console.log('📋 Input details:', inputTypes);
            }

            // Look for buttons
            const buttons = await page.locator('button').count();
            console.log('🔘 Buttons found:', buttons);

            if (buttons > 0) {
                const buttonTexts = await page.locator('button').evaluateAll(buttons =>
                    buttons.map(button => button.textContent?.trim())
                );
                console.log('📋 Button texts:', buttonTexts);
            }

            // Try to register/login if possible
            if (inputs >= 2) {
                console.log('🔐 Attempting to fill login form...');

                const timestamp = Date.now().toString().slice(-6);
                const username = `debug_${timestamp}`;

                try {
                    // Try various input selectors
                    const usernameInput = page.locator('input').first();
                    const passwordInput = page.locator('input').nth(1);

                    await usernameInput.fill(username);
                    await passwordInput.fill('test123');

                    console.log('✅ Filled login form');

                    // Try to click first button
                    const firstButton = page.locator('button').first();
                    await firstButton.click();

                    console.log('✅ Clicked submit button');

                    // Wait for response
                    await page.waitForTimeout(5000);

                    // Take screenshot after login attempt
                    await page.screenshot({ path: 'debug-after-login.png' });
                    console.log('📸 Post-login screenshot taken');

                    // Check for success indicators
                    const newBodyText = await page.locator('body').textContent();
                    console.log('📝 Page after login:', newBodyText?.slice(0, 200) + '...');

                    // Check for specific connection indicators
                    const connectionIndicators = [
                        'Connected',
                        'Disconnected',
                        'Available Games',
                        'Create Game',
                        'Welcome',
                        'Dashboard',
                        'Lobby'
                    ];

                    for (const indicator of connectionIndicators) {
                        const count = await page.locator(`text=${indicator}`).count();
                        if (count > 0) {
                            console.log(`✅ Found "${indicator}": ${count} times`);
                        }
                    }

                    // Check for disconnection specifically
                    const disconnectedCount = await page.locator('text=Disconnected').count();
                    if (disconnectedCount > 0) {
                        console.log('⚠️ DISCONNECTION DETECTED!');
                        // Take special screenshot
                        await page.screenshot({ path: 'debug-disconnected-state.png' });
                    } else {
                        console.log('✅ No disconnection indicators found');
                    }

                } catch (loginError) {
                    console.log('❌ Login attempt failed:', loginError instanceof Error ? loginError.message : String(loginError));
                    await page.screenshot({ path: 'debug-login-error.png' });
                }
            } else {
                console.log('⚠️ Not enough input fields for login test');
            }

            // Check console logs
            const logs: string[] = [];
            page.on('console', msg => {
                logs.push(`${msg.type()}: ${msg.text()}`);
            });

            // Wait a bit more to collect logs
            await page.waitForTimeout(3000);

            if (logs.length > 0) {
                console.log('📊 Browser console logs:');
                logs.slice(-10).forEach(log => console.log('  ', log));
            }

        } catch (error) {
            console.error('❌ Debug test error:', error);
            await page.screenshot({ path: 'debug-error-state.png' });
        }

        console.log('🏁 Debug test completed');
    });
}); 