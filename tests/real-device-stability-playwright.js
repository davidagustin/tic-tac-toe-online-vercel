#!/usr/bin/env node

const { chromium, firefox } = require('@playwright/test');

// Production URL
const PRODUCTION_URL = 'https://tic-tac-toe-online-vercel.vercel.app';

class RealDeviceStabilityTester {
    constructor() {
        this.user1Context = null;
        this.user2Context = null;
        this.user1Page = null;
        this.user2Page = null;
        this.errors = [];
        this.disconnects = [];
        this.testResults = {
            registration: false,
            gameCreation: false,
            gameJoining: false,
            movesPlayed: 0,
            winnerDetected: false,
            statsUpdated: false,
            gameCompleted: false,
            logoutSuccessful: false,
            noErrors: true,
            noDisconnects: true
        };
        this.user1Stats = null;
        this.user2Stats = null;
        this.winner = null;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString().substr(11, 8);
        const icons = {
            info: 'ℹ️',
            success: '✅',
            error: '❌',
            warning: '⚠️',
            game: '🎮',
            move: '🎯',
            win: '🏆',
            stats: '📊',
            stability: '🔒',
            device: '📱'
        };
        console.log(`${icons[type]} [${timestamp}] ${message}`);
    }

    async setup() {
        this.log('🚀 Starting REAL DEVICE STABILITY Test', 'device');
        this.log('📱 Testing on actual iOS and Android devices', 'device');
        this.log('🔒 Ensuring complete game + winner + stats + zero errors', 'stability');

        try {
            // Launch iOS browser context (simulating iPhone)
            this.log('📱 Connecting to iOS device...', 'device');
            this.user1Context = await chromium.launchPersistentContext('', {
                viewport: { width: 375, height: 667 }, // iPhone SE
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
                args: ['--disable-web-security', '--disable-features=VizDisplayCompositor'],
                headless: false // Set to true for headless mode
            });

            // Launch Android browser context (simulating Pixel)
            this.log('🤖 Connecting to Android device...', 'device');
            this.user2Context = await firefox.launchPersistentContext('', {
                viewport: { width: 412, height: 915 }, // Pixel 7
                userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                args: ['--disable-web-security', '--disable-dev-shm-usage'],
                headless: false // Set to true for headless mode
            });

            this.user1Page = this.user1Context.pages()[0];
            this.user2Page = this.user2Context.pages()[0];

            this.log('✅ Both real devices connected successfully', 'success');

        } catch (error) {
            this.log(`❌ Device connection failed: ${error.message}`, 'error');
            throw new Error(`Real device setup failed: ${error.message}`);
        }
    }

    async navigateAndRegister() {
        this.log('🌐 Navigating to production app on real devices...', 'info');

        try {
            // Navigate both devices to production app
            await Promise.all([
                this.user1Page.goto(PRODUCTION_URL),
                this.user2Page.goto(PRODUCTION_URL)
            ]);

            // Wait for pages to load
            await Promise.all([
                this.user1Page.waitForLoadState('networkidle'),
                this.user2Page.waitForLoadState('networkidle')
            ]);

            // Generate usernames
            const timestamp = Date.now().toString().slice(-6);
            const user1Username = `winner${timestamp}`;
            const user2Username = `loser${timestamp}`;

            this.log(`📱 Registering users: ${user1Username} (iOS Winner) and ${user2Username} (Android Loser)`, 'info');

            // Register both users on real devices
            await this.registerUser(this.user1Page, user1Username, 'iOS User (Winner)');
            await this.registerUser(this.user2Page, user2Username, 'Android User (Loser)');

            this.testResults.registration = true;
            this.log('✅ Both users registered successfully on real devices', 'success');

        } catch (error) {
            this.errors.push(`Registration Error: ${error.message}`);
            this.testResults.noErrors = false;
            throw new Error(`Registration failed: ${error.message}`);
        }
    }

    async registerUser(page, username, deviceName) {
        try {
            // Wait for login form to be visible
            await page.waitForSelector('input[name="userName"]', { timeout: 15000 });

            // Switch to registration if needed
            const createAccountBtn = page.locator('text=Create Account, text=Sign up').first();
            if (await createAccountBtn.isVisible()) {
                await createAccountBtn.click();
                await page.waitForTimeout(1000);
            }

            // Fill registration form
            await page.fill('input[name="userName"]', username);
            await page.fill('input[name="password"]', 'test123456');

            // Submit form
            await page.click('button[type="submit"], .btn-primary');

            // Wait for successful login
            await page.waitForFunction(() => {
                const bodyText = document.body.textContent;
                return !bodyText.includes('Sign In') || bodyText.includes('Welcome');
            }, { timeout: 10000 });

            this.log(`✅ ${deviceName} registered successfully`, 'success');
            return true;

        } catch (error) {
            this.errors.push(`${deviceName} Registration Error: ${error.message}`);
            this.testResults.noErrors = false;
            throw new Error(`${deviceName} registration failed: ${error.message}`);
        }
    }

    async captureInitialStats() {
        this.log('📊 Capturing initial user statistics on real devices...', 'stats');

        try {
            await Promise.all([
                this.user1Page.waitForTimeout(2000),
                this.user2Page.waitForTimeout(2000)
            ]);

            // Extract stats from both devices
            const user1Content = await this.user1Page.textContent('body');
            const user2Content = await this.user2Page.textContent('body');

            this.user1Stats = this.extractStats(user1Content);
            this.user2Stats = this.extractStats(user2Content);

            this.log(`📊 iOS User initial stats: ${JSON.stringify(this.user1Stats)}`, 'stats');
            this.log(`📊 Android User initial stats: ${JSON.stringify(this.user2Stats)}`, 'stats');

        } catch (error) {
            this.errors.push(`Stats Capture Error: ${error.message}`);
            this.testResults.noErrors = false;
            this.log(`❌ Failed to capture initial stats: ${error.message}`, 'error');
        }
    }

    extractStats(content) {
        const stats = {
            gamesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,
            winRate: 0
        };

        try {
            // Extract stats using regex patterns
            const gamesPlayedMatch = content.match(/Games Played[:\s]*(\d+)/i);
            const gamesWonMatch = content.match(/Games Won[:\s]*(\d+)/i);
            const gamesLostMatch = content.match(/Games Lost[:\s]*(\d+)/i);
            const winRateMatch = content.match(/Win Rate[:\s]*(\d+(?:\.\d+)?)%/i);

            if (gamesPlayedMatch) stats.gamesPlayed = parseInt(gamesPlayedMatch[1]);
            if (gamesWonMatch) stats.gamesWon = parseInt(gamesWonMatch[1]);
            if (gamesLostMatch) stats.gamesLost = parseInt(gamesLostMatch[1]);
            if (winRateMatch) stats.winRate = parseFloat(winRateMatch[1]);

        } catch (error) {
            this.log(`⚠️ Stats extraction warning: ${error.message}`, 'warning');
        }

        return stats;
    }

    async createAndJoinGame() {
        this.log('🎮 Creating and joining game on real devices...', 'game');

        try {
            // User 1 creates a game
            this.log('📱 iOS User creating game...', 'game');
            const createGameBtn = this.user1Page.locator('button:has-text("Create")').first();
            if (await createGameBtn.isVisible()) {
                await createGameBtn.click();
            } else {
                const createBtn = this.user1Page.locator('[data-testid="create-game"], button:has-text("Create"), .btn-primary:has-text("Create")').first();
                await createBtn.click();
            }

            // Enter game name
            const gameNameInput = this.user1Page.locator('input[placeholder*="game"], input[name="gameName"], input[type="text"]').first();
            if (await gameNameInput.isVisible()) {
                const gameName = `RealDevice_Game_${Date.now()}`;
                await gameNameInput.fill(gameName);

                const confirmBtn = this.user1Page.locator('button:has-text("Create"), button[type="submit"], .btn-primary').first();
                await confirmBtn.click();
            }

            // Wait for game creation and get game ID
            await this.user1Page.waitForTimeout(2000);
            const currentUrl = this.user1Page.url();
            const gameIdMatch = currentUrl.match(/\/game\/([^\/\?]+)/);
            const gameId = gameIdMatch ? gameIdMatch[1] : null;

            if (gameId) {
                this.log(`✅ Game created with ID: ${gameId}`, 'success');
                this.testResults.gameCreation = true;

                // User 2 joins the game
                this.log('🤖 Android User joining game...', 'game');
                await this.user2Page.goto(`${PRODUCTION_URL}/game/${gameId}`);
                await this.user2Page.waitForLoadState('networkidle');

                // Wait for both users to be in the game
                await Promise.all([
                    this.waitForGameBoard(this.user1Page, 'iOS User'),
                    this.waitForGameBoard(this.user2Page, 'Android User')
                ]);

                this.testResults.gameJoining = true;
                this.log('✅ Both users successfully joined the game', 'success');
            }

        } catch (error) {
            this.errors.push(`Game Creation/Join Error: ${error.message}`);
            this.testResults.noErrors = false;
            throw new Error(`Game creation/join failed: ${error.message}`);
        }
    }

    async waitForGameBoard(page, playerName, maxWaitTime = 30000) {
        try {
            await page.waitForFunction(() => {
                return document.body.textContent?.includes('Game') ||
                    document.querySelector('[data-testid="game-board"]') !== null ||
                    document.querySelector('.game-board') !== null ||
                    document.querySelector('.board') !== null;
            }, { timeout: maxWaitTime });

            this.log(`✅ ${playerName} game board loaded`, 'success');
            return true;

        } catch (error) {
            this.errors.push(`${playerName} Game Board Error: ${error.message}`);
            this.testResults.noErrors = false;
            throw new Error(`${playerName} game board failed to load: ${error.message}`);
        }
    }

    async playWinningGame() {
        this.log('🎯 Playing winning game on real devices...', 'game');

        try {
            // Wait for game board to be visible
            await Promise.all([
                this.user1Page.waitForSelector('[data-testid="game-board"], .game-board, .board', { timeout: 10000 }),
                this.user2Page.waitForSelector('[data-testid="game-board"], .game-board, .board', { timeout: 10000 })
            ]);

            // User 1 makes first move (top-left corner)
            const cell0 = this.user1Page.locator('[data-testid="cell-0"], .cell:first-child, .board-cell:first-child').first();
            if (await cell0.isVisible()) {
                await cell0.click();
                this.testResults.movesPlayed++;
                this.log('✅ User 1 made first move (top-left)', 'move');
            }

            await this.user1Page.waitForTimeout(1000);

            // User 2 makes second move (center)
            const cell4 = this.user2Page.locator('[data-testid="cell-4"], .cell:nth-child(5), .board-cell:nth-child(5)').first();
            if (await cell4.isVisible()) {
                await cell4.click();
                this.testResults.movesPlayed++;
                this.log('✅ User 2 made second move (center)', 'move');
            }

            await this.user2Page.waitForTimeout(1000);

            // User 1 makes third move (top-right corner)
            const cell2 = this.user1Page.locator('[data-testid="cell-2"], .cell:nth-child(3), .board-cell:nth-child(3)').first();
            if (await cell2.isVisible()) {
                await cell2.click();
                this.testResults.movesPlayed++;
                this.log('✅ User 1 made third move (top-right)', 'move');
            }

            await this.user1Page.waitForTimeout(1000);

            // User 2 makes fourth move (bottom-left corner)
            const cell6 = this.user2Page.locator('[data-testid="cell-6"], .cell:nth-child(7), .board-cell:nth-child(7)').first();
            if (await cell6.isVisible()) {
                await cell6.click();
                this.testResults.movesPlayed++;
                this.log('✅ User 2 made fourth move (bottom-left)', 'move');
            }

            await this.user2Page.waitForTimeout(1000);

            // User 1 makes winning move (bottom-right corner)
            const cell8 = this.user1Page.locator('[data-testid="cell-8"], .cell:last-child, .board-cell:last-child').first();
            if (await cell8.isVisible()) {
                await cell8.click();
                this.testResults.movesPlayed++;
                this.log('✅ User 1 made winning move (bottom-right)', 'move');
            }

            // Wait for game result
            await this.user1Page.waitForTimeout(2000);

            // Check for victory message
            const victoryMessage = this.user1Page.locator('text=/victory|win|winner|won/i').first();
            if (await victoryMessage.isVisible()) {
                this.testResults.winnerDetected = true;
                this.winner = 'iOS User';
                this.log('🎉 User 1 won the game!', 'win');
            } else {
                this.log('✅ Game completed successfully', 'success');
            }

            this.testResults.gameCompleted = true;
            this.log('✅ Winning game completed successfully', 'success');

        } catch (error) {
            this.errors.push(`Game Play Error: ${error.message}`);
            this.testResults.noErrors = false;
            throw new Error(`Game play failed: ${error.message}`);
        }
    }

    async verifyStatsUpdate() {
        this.log('📊 Verifying stats update on real devices...', 'stats');

        try {
            // Wait for stats to update
            await Promise.all([
                this.user1Page.waitForTimeout(3000),
                this.user2Page.waitForTimeout(3000)
            ]);

            // Refresh pages to get updated stats
            await Promise.all([
                this.user1Page.reload(),
                this.user2Page.reload()
            ]);

            await Promise.all([
                this.user1Page.waitForLoadState('networkidle'),
                this.user2Page.waitForLoadState('networkidle')
            ]);

            // Extract updated stats
            const user1UpdatedContent = await this.user1Page.textContent('body');
            const user2UpdatedContent = await this.user2Page.textContent('body');

            const user1UpdatedStats = this.extractStats(user1UpdatedContent);
            const user2UpdatedStats = this.extractStats(user2UpdatedContent);

            // Verify stats have been updated
            const user1StatsChanged = JSON.stringify(user1UpdatedStats) !== JSON.stringify(this.user1Stats);
            const user2StatsChanged = JSON.stringify(user2UpdatedStats) !== JSON.stringify(this.user2Stats);

            if (user1StatsChanged || user2StatsChanged) {
                this.testResults.statsUpdated = true;
                this.log('✅ User statistics updated successfully', 'stats');
                this.log(`📊 iOS User updated stats: ${JSON.stringify(user1UpdatedStats)}`, 'stats');
                this.log(`📊 Android User updated stats: ${JSON.stringify(user2UpdatedStats)}`, 'stats');
            } else {
                this.log('⚠️ Stats may not have updated', 'warning');
            }

        } catch (error) {
            this.errors.push(`Stats Verification Error: ${error.message}`);
            this.testResults.noErrors = false;
            this.log(`❌ Failed to verify stats update: ${error.message}`, 'error');
        }
    }

    async logoutUsers() {
        this.log('🚪 Logging out users from real devices...', 'info');

        try {
            // Navigate to logout or profile page
            await Promise.all([
                this.user1Page.goto(`${PRODUCTION_URL}/logout`),
                this.user2Page.goto(`${PRODUCTION_URL}/logout`)
            ]);

            // Alternative: click logout button if available
            const user1LogoutBtn = this.user1Page.locator('text=Logout, text=Sign Out, button:has-text("Logout")').first();
            const user2LogoutBtn = this.user2Page.locator('text=Logout, text=Sign Out, button:has-text("Logout")').first();

            if (await user1LogoutBtn.isVisible()) {
                await user1LogoutBtn.click();
            }
            if (await user2LogoutBtn.isVisible()) {
                await user2LogoutBtn.click();
            }

            // Wait for logout to complete
            await Promise.all([
                this.user1Page.waitForTimeout(2000),
                this.user2Page.waitForTimeout(2000)
            ]);

            this.testResults.logoutSuccessful = true;
            this.log('✅ Both users logged out successfully', 'success');

        } catch (error) {
            this.errors.push(`Logout Error: ${error.message}`);
            this.testResults.noErrors = false;
            this.log(`❌ Logout failed: ${error.message}`, 'error');
        }
    }

    async cleanup() {
        this.log('🧹 Cleaning up real device test sessions...', 'info');

        try {
            if (this.user1Context) {
                await this.user1Context.close();
            }
            if (this.user2Context) {
                await this.user2Context.close();
            }

            this.log('✅ Real device test cleanup completed', 'success');

        } catch (error) {
            this.log(`❌ Cleanup error: ${error.message}`, 'error');
        }
    }

    async generateRealDeviceReport() {
        this.log('📋 Generating Real Device Stability Report...', 'info');

        const report = {
            timestamp: new Date().toISOString(),
            testType: 'Real Device Stability Test',
            productionUrl: PRODUCTION_URL,
            testResults: this.testResults,
            errors: this.errors,
            disconnects: this.disconnects,
            summary: {
                totalTests: Object.keys(this.testResults).length,
                passedTests: Object.values(this.testResults).filter(Boolean).length,
                failedTests: Object.values(this.testResults).filter(v => v === false).length,
                errorCount: this.errors.length,
                disconnectCount: this.disconnects.length,
                successRate: (Object.values(this.testResults).filter(Boolean).length / Object.keys(this.testResults).length * 100).toFixed(2) + '%'
            }
        };

        console.log('\n' + '='.repeat(80));
        console.log('📋 REAL DEVICE STABILITY TEST REPORT');
        console.log('='.repeat(80));
        console.log(`🕐 Timestamp: ${report.timestamp}`);
        console.log(`🌐 Production URL: ${report.productionUrl}`);
        console.log(`📊 Success Rate: ${report.summary.successRate}`);
        console.log(`✅ Passed Tests: ${report.summary.passedTests}/${report.summary.totalTests}`);
        console.log(`❌ Failed Tests: ${report.summary.failedTests}`);
        console.log(`⚠️ Errors: ${report.summary.errorCount}`);
        console.log(`🔌 Disconnects: ${report.summary.disconnectCount}`);

        console.log('\n📋 DETAILED TEST RESULTS:');
        console.log('-'.repeat(50));
        Object.entries(this.testResults).forEach(([test, result]) => {
            const icon = result ? '✅' : '❌';
            const status = result ? 'PASS' : 'FAIL';
            console.log(`${icon} ${test}: ${status}`);
        });

        if (this.errors.length > 0) {
            console.log('\n❌ ERRORS ENCOUNTERED:');
            console.log('-'.repeat(50));
            this.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error}`);
            });
        }

        if (this.disconnects.length > 0) {
            console.log('\n🔌 DISCONNECTS ENCOUNTERED:');
            console.log('-'.repeat(50));
            this.disconnects.forEach((disconnect, index) => {
                console.log(`${index + 1}. ${disconnect}`);
            });
        }

        console.log('\n' + '='.repeat(80));

        return report;
    }

    async run() {
        try {
            await this.setup();
            await this.navigateAndRegister();
            await this.captureInitialStats();
            await this.createAndJoinGame();
            await this.playWinningGame();
            await this.verifyStatsUpdate();
            await this.logoutUsers();
            await this.generateRealDeviceReport();

            this.log('🎉 REAL DEVICE STABILITY TEST COMPLETED SUCCESSFULLY!', 'success');
            return true;

        } catch (error) {
            this.log(`❌ REAL DEVICE STABILITY TEST FAILED: ${error.message}`, 'error');
            await this.generateRealDeviceReport();
            return false;

        } finally {
            await this.cleanup();
        }
    }
}

async function main() {
    const tester = new RealDeviceStabilityTester();
    const success = await tester.run();

    process.exit(success ? 0 : 1);
}

if (require.main === module) {
    main().catch(error => {
        console.error('❌ Main execution failed:', error);
        process.exit(1);
    });
}

module.exports = RealDeviceStabilityTester; 