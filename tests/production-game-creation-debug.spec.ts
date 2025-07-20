import { test } from '@playwright/test';

test.describe('Production Game Creation Debug', () => {
    test('Debug game creation step in production', async ({ browser }) => {
        console.log('🔍 Starting production game creation debug...');

        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            const timestamp = Date.now().toString().slice(-6);
            const username = `debug_${timestamp}`;
            const gameName = `DebugGame_${timestamp}`;

            console.log('👤 Test user:', username);
            console.log('🎮 Test game:', gameName);

            // Step 1: Login
            console.log('\n📝 Step 1: Login Process');
            await page.goto('https://tic-tac-toe-online-vercel.vercel.app');
            await page.waitForLoadState('networkidle', { timeout: 30000 });

            await page.fill('input[name="username"]', username);
            await page.fill('input[name="password"]', 'test123');
            await page.click('button:has-text("Create New Account")');
            await page.waitForTimeout(5000);

            // Check if login is needed
            const needsLogin = await page.locator('input[name="username"]').isVisible();
            if (needsLogin) {
                console.log('🔄 Logging in after registration');
                await page.fill('input[name="username"]', username);
                await page.fill('input[name="password"]', 'test123');
                await page.click('button:has-text("Sign In")');
                await page.waitForTimeout(5000);
            }

            // Take screenshot of lobby
            await page.screenshot({ path: 'debug-lobby-state.png' });
            console.log('📸 Lobby screenshot taken');

            // Step 2: Analyze lobby state
            console.log('\n🔍 Step 2: Analyzing Lobby State');

            const bodyText = await page.locator('body').textContent();
            console.log('📝 Page content includes:', bodyText?.slice(0, 300) + '...');

            // Check for various lobby indicators
            const lobbyIndicators = [
                'Available Games',
                'Create Game',
                'Welcome',
                'Games Won',
                'Dashboard',
                'Lobby'
            ];

            for (const indicator of lobbyIndicators) {
                const count = await page.locator(`text=${indicator}`).count();
                if (count > 0) {
                    console.log(`✅ Found "${indicator}": ${count} times`);
                }
            }

            // Check all buttons
            const buttonCount = await page.locator('button').count();
            console.log(`🔘 Total buttons found: ${buttonCount}`);

            if (buttonCount > 0) {
                const buttonTexts = await page.locator('button').evaluateAll(buttons =>
                    buttons.map(button => button.textContent?.trim()).filter(text => text)
                );
                console.log('📋 Button texts:', buttonTexts);
            }

            // Step 3: Try to find and click Create Game button
            console.log('\n🎮 Step 3: Game Creation Attempt');

            // Try multiple selectors for Create Game button
            const createButtonSelectors = [
                'button:has-text("Create Game")',
                'button:has-text("Create")',
                'button:has-text("New Game")',
                'button[data-testid="create-game"]',
                '.create-game-button'
            ];

            let createButtonFound = false;
            for (const selector of createButtonSelectors) {
                const buttonExists = await page.locator(selector).count() > 0;
                if (buttonExists) {
                    console.log(`✅ Found Create Game button with selector: ${selector}`);
                    createButtonFound = true;

                    try {
                        await page.click(selector);
                        console.log('✅ Successfully clicked Create Game button');
                        await page.waitForTimeout(3000);

                        // Take screenshot after clicking
                        await page.screenshot({ path: 'debug-after-create-click.png' });
                        console.log('📸 Post-click screenshot taken');

                        break;
                    } catch (clickError) {
                        console.log(`⚠️ Failed to click with selector ${selector}:`, clickError instanceof Error ? clickError.message : String(clickError));
                    }
                } else {
                    console.log(`❌ Create Game button not found with selector: ${selector}`);
                }
            }

            if (!createButtonFound) {
                console.log('❌ No Create Game button found with any selector');

                // Look for any clickable elements that might be the create button
                const clickableElements = await page.locator('button, [role="button"], .cursor-pointer').evaluateAll(elements =>
                    elements.map(el => ({
                        tagName: el.tagName,
                        textContent: el.textContent?.trim(),
                        className: el.className,
                        id: el.id
                    })).filter(el => el.textContent)
                );
                console.log('🔍 All clickable elements:', clickableElements);
            }

            // Step 4: Check for game creation form
            console.log('\n📝 Step 4: Checking for Game Creation Form');

            const inputCount = await page.locator('input').count();
            console.log(`🔤 Input fields found: ${inputCount}`);

            if (inputCount > 0) {
                const inputs = await page.locator('input').evaluateAll(inputs =>
                    inputs.map(input => ({
                        type: (input as HTMLInputElement).type,
                        placeholder: (input as HTMLInputElement).placeholder,
                        name: (input as HTMLInputElement).name,
                        value: (input as HTMLInputElement).value
                    }))
                );
                console.log('📋 Input field details:', inputs);

                // Try to fill game name if there's a suitable input
                const gameNameInputs = [
                    'input[placeholder*="Game"]',
                    'input[placeholder*="Name"]',
                    'input[placeholder*="game"]',
                    'input[placeholder*="name"]',
                    'input[type="text"]:not([name="username"])'
                ];

                for (const selector of gameNameInputs) {
                    const inputExists = await page.locator(selector).count() > 0;
                    if (inputExists) {
                        console.log(`✅ Found game name input with selector: ${selector}`);
                        try {
                            await page.fill(selector, gameName);
                            console.log('✅ Successfully filled game name');
                            break;
                        } catch (fillError) {
                            console.log(`⚠️ Failed to fill with selector ${selector}:`, fillError instanceof Error ? fillError.message : String(fillError));
                        }
                    }
                }
            }

            // Step 5: Try to submit game creation
            console.log('\n🚀 Step 5: Game Creation Submission');

            const submitSelectors = [
                'button:has-text("Create Game")',
                'button:has-text("Create")',
                'button:has-text("Submit")',
                'button[type="submit"]',
                'input[type="submit"]'
            ];

            for (const selector of submitSelectors) {
                const buttonExists = await page.locator(selector).count() > 0;
                if (buttonExists) {
                    console.log(`✅ Found submit button with selector: ${selector}`);
                    try {
                        await page.click(selector);
                        console.log('✅ Successfully clicked submit button');
                        await page.waitForTimeout(5000);

                        // Check if game was created
                        const gameListText = await page.locator('body').textContent();
                        if (gameListText?.includes(gameName)) {
                            console.log('🎉 Game creation successful! Game appears in list');
                        } else {
                            console.log('⚠️ Game may not have been created or not visible yet');
                        }

                        break;
                    } catch (submitError) {
                        console.log(`⚠️ Failed to submit with selector ${selector}:`, submitError instanceof Error ? submitError.message : String(submitError));
                    }
                }
            }

            // Final screenshot
            await page.screenshot({ path: 'debug-final-state.png' });
            console.log('📸 Final state screenshot taken');

        } catch (error) {
            console.error('❌ Debug test error:', error);
            await page.screenshot({ path: 'debug-error-state.png' });
        } finally {
            await context.close();
        }

        console.log('🏁 Game creation debug completed');
    });
}); 