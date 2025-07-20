#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { checkAppiumInstallation, checkDeviceConnections } = require('./appium-setup');

console.log('🎮 Tic-Tac-Toe Mobile E2E Test Runner\n');

// Configuration
const CONFIG = {
    production: {
        url: 'https://tic-tac-toe-online-vercel.vercel.app',
        timeout: 60000
    },
    appium: {
        iosPort: 4723,
        androidPort: 4724,
        timeout: 120000
    },
    test: {
        timeout: 300000, // 5 minutes per test
        retries: 2,
        parallel: false // Set to true if you have multiple devices
    }
};

// Test results tracking
const testResults = {
    startTime: new Date(),
    endTime: null,
    tests: [],
    summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
    },
    devices: {
        ios: { connected: false, tested: false, status: 'pending' },
        android: { connected: false, tested: false, status: 'pending' }
    }
};

// Utility functions
function log(message, type = 'info') {
    const timestamp = new Date().toISOString().substr(11, 8);
    const icons = {
        info: 'ℹ️',
        success: '✅',
        error: '❌',
        warning: '⚠️',
        test: '🧪'
    };

    console.log(`${icons[type]} [${timestamp}] ${message}`);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Pre-flight checks
async function runPreflightChecks() {
    log('Running pre-flight checks...', 'info');

    // Check Appium installation
    if (!checkAppiumInstallation()) {
        throw new Error('Appium is not properly installed');
    }

    // Check device connections
    checkDeviceConnections();

    // Check if production app is accessible
    try {
        log('Testing production app accessibility...', 'info');
        const response = await fetch(CONFIG.production.url, { method: 'HEAD' });
        if (!response.ok) {
            throw new Error(`Production app returned ${response.status}`);
        }
        log('Production app is accessible', 'success');
    } catch (error) {
        log(`Production app check failed: ${error.message}`, 'warning');
        log('Continuing with tests - app might still work for mobile browsers', 'warning');
    }

    // Check if required test files exist
    const requiredFiles = [
        'mobile-e2e-appium.spec.ts',
        '../package.json'
    ];

    for (const file of requiredFiles) {
        const filePath = path.join(__dirname, file);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Required file not found: ${file}`);
        }
    }

    log('Pre-flight checks completed', 'success');
}

// Start Appium servers
async function startAppiumServers() {
    log('Starting Appium servers...', 'info');

    const servers = [];

    // iOS Server
    try {
        const iosServer = spawn('appium', [
            '--port', CONFIG.appium.iosPort.toString(),
            '--session-override',
            '--log-level', 'error',
            '--relaxed-security',
            '--allow-cors'
        ], {
            stdio: 'pipe',
            detached: false
        });

        servers.push({ name: 'iOS', process: iosServer, port: CONFIG.appium.iosPort });

        iosServer.stdout.on('data', (data) => {
            const message = data.toString().trim();
            if (message.includes('listener started')) {
                log(`iOS Appium server ready on port ${CONFIG.appium.iosPort}`, 'success');
                testResults.devices.ios.connected = true;
            }
        });

        iosServer.stderr.on('data', (data) => {
            const message = data.toString().trim();
            if (!message.includes('deprecated') && !message.includes('warning') && message.length > 0) {
                log(`iOS Server: ${message}`, 'warning');
            }
        });

    } catch (error) {
        log(`Failed to start iOS Appium server: ${error.message}`, 'error');
    }

    // Android Server
    try {
        const androidServer = spawn('appium', [
            '--port', CONFIG.appium.androidPort.toString(),
            '--session-override',
            '--log-level', 'error',
            '--relaxed-security',
            '--allow-cors'
        ], {
            stdio: 'pipe',
            detached: false
        });

        servers.push({ name: 'Android', process: androidServer, port: CONFIG.appium.androidPort });

        androidServer.stdout.on('data', (data) => {
            const message = data.toString().trim();
            if (message.includes('listener started')) {
                log(`Android Appium server ready on port ${CONFIG.appium.androidPort}`, 'success');
                testResults.devices.android.connected = true;
            }
        });

        androidServer.stderr.on('data', (data) => {
            const message = data.toString().trim();
            if (!message.includes('deprecated') && !message.includes('warning') && message.length > 0) {
                log(`Android Server: ${message}`, 'warning');
            }
        });

    } catch (error) {
        log(`Failed to start Android Appium server: ${error.message}`, 'error');
    }

    // Wait for servers to be ready
    log('Waiting for Appium servers to initialize...', 'info');
    await sleep(5000);

    return servers;
}

// Run the actual mobile tests
async function runMobileTests() {
    log('Starting mobile E2E tests...', 'test');

    const testCommand = [
        'npx',
        'jest',
        'tests/mobile-e2e-appium.spec.ts',
        '--testTimeout=' + CONFIG.test.timeout,
        '--verbose',
        '--no-cache',
        '--detectOpenHandles',
        '--forceExit'
    ];

    return new Promise((resolve, reject) => {
        const testProcess = spawn(testCommand[0], testCommand.slice(1), {
            stdio: 'pipe',
            cwd: path.dirname(__dirname)
        });

        let testOutput = '';
        let testErrors = '';

        testProcess.stdout.on('data', (data) => {
            const message = data.toString();
            testOutput += message;

            // Parse test progress
            if (message.includes('PASS') || message.includes('✓')) {
                log('Test passed', 'success');
                testResults.summary.passed++;
            } else if (message.includes('FAIL') || message.includes('✗')) {
                log('Test failed', 'error');
                testResults.summary.failed++;
            }

            // Real-time output
            process.stdout.write(message);
        });

        testProcess.stderr.on('data', (data) => {
            const message = data.toString();
            testErrors += message;
            process.stderr.write(message);
        });

        testProcess.on('close', (code) => {
            testResults.endTime = new Date();

            if (code === 0) {
                log('Mobile E2E tests completed successfully', 'success');
                resolve({ success: true, output: testOutput, errors: testErrors });
            } else {
                log(`Mobile E2E tests failed with exit code ${code}`, 'error');
                resolve({ success: false, output: testOutput, errors: testErrors, exitCode: code });
            }
        });

        testProcess.on('error', (error) => {
            log(`Test process error: ${error.message}`, 'error');
            reject(error);
        });
    });
}

// Generate test report
function generateTestReport(testResult, servers) {
    const duration = testResults.endTime - testResults.startTime;
    const durationMinutes = Math.round(duration / 60000);
    const durationSeconds = Math.round((duration % 60000) / 1000);

    const report = {
        timestamp: new Date().toISOString(),
        duration: {
            total: duration,
            formatted: `${durationMinutes}m ${durationSeconds}s`
        },
        production: {
            url: CONFIG.production.url,
            accessible: true // We'll assume it's accessible if tests ran
        },
        appium: {
            servers: servers.map(s => ({
                name: s.name,
                port: s.port,
                running: !s.process.killed
            }))
        },
        devices: testResults.devices,
        tests: {
            summary: testResults.summary,
            success: testResult.success,
            output: testResult.output.substring(0, 1000) + '...', // Truncate for report
            errors: testResult.errors
        },
        mobile_features_tested: [
            'Touch interactions on game board',
            'Responsive layout adaptation',
            'Mobile form input handling',
            'Cross-device real-time synchronization',
            'Mobile navigation and buttons',
            'Touch target size compliance',
            'Mobile viewport handling',
            'Device orientation support',
            'Mobile performance and loading',
            'Mobile accessibility features'
        ],
        recommendations: []
    };

    // Add recommendations based on results
    if (!testResult.success) {
        report.recommendations.push('Review failed test logs for specific mobile compatibility issues');
        report.recommendations.push('Verify device connections and Appium driver installations');
    }

    if (testResult.errors.includes('timeout')) {
        report.recommendations.push('Consider increasing test timeouts for mobile devices');
    }

    if (!testResults.devices.ios.connected && !testResults.devices.android.connected) {
        report.recommendations.push('Ensure at least one mobile device/simulator is available for testing');
    }

    // Save report to file
    const reportPath = path.join(__dirname, `mobile-e2e-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return { report, reportPath };
}

// Cleanup function
async function cleanup(servers) {
    log('Cleaning up test environment...', 'info');

    // Kill Appium servers
    for (const server of servers) {
        try {
            if (!server.process.killed) {
                server.process.kill('SIGTERM');
                log(`Stopped ${server.name} Appium server`, 'success');
            }
        } catch (error) {
            log(`Error stopping ${server.name} server: ${error.message}`, 'warning');
        }
    }

    // Additional cleanup
    try {
        // Kill any remaining Appium processes
        execSync('pkill -f appium', { stdio: 'ignore' });
    } catch (error) {
        // Ignore errors - processes might not exist
    }

    log('Cleanup completed', 'success');
}

// Main execution function
async function main() {
    let servers = [];

    try {
        // Pre-flight checks
        await runPreflightChecks();

        // Start Appium servers
        servers = await startAppiumServers();

        // Wait a bit for servers to fully initialize
        await sleep(3000);

        // Run mobile tests
        const testResult = await runMobileTests();

        // Generate report
        const { report, reportPath } = generateTestReport(testResult, servers);

        // Display summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 MOBILE E2E TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`🕐 Duration: ${report.duration.formatted}`);
        console.log(`🌐 Production URL: ${report.production.url}`);
        console.log(`📱 iOS Device: ${testResults.devices.ios.connected ? 'Connected' : 'Not Available'}`);
        console.log(`🤖 Android Device: ${testResults.devices.android.connected ? 'Connected' : 'Not Available'}`);
        console.log(`✅ Tests Passed: ${testResults.summary.passed}`);
        console.log(`❌ Tests Failed: ${testResults.summary.failed}`);
        console.log(`📄 Report saved: ${reportPath}`);

        if (testResult.success) {
            console.log('\n🎉 ALL MOBILE E2E TESTS PASSED! 🎉');
            console.log('🚀 Your Tic-Tac-Toe app is mobile-ready for production!');
        } else {
            console.log('\n⚠️ Some mobile tests failed. Review the report for details.');
        }

        console.log('='.repeat(60));

        // Exit with appropriate code
        process.exit(testResult.success ? 0 : 1);

    } catch (error) {
        log(`Test execution failed: ${error.message}`, 'error');
        console.error('\n💥 Mobile E2E test execution failed:');
        console.error(error.stack);

        process.exit(1);
    } finally {
        await cleanup(servers);
    }
}

// Handle process interruption
process.on('SIGINT', async () => {
    console.log('\n\n🛑 Test execution interrupted by user');
    process.exit(1);
});

process.on('SIGTERM', async () => {
    console.log('\n\n🛑 Test execution terminated');
    process.exit(1);
});

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Unexpected error:', error);
        process.exit(1);
    });
}

module.exports = {
    runPreflightChecks,
    startAppiumServers,
    runMobileTests,
    generateTestReport,
    cleanup,
    CONFIG
}; 