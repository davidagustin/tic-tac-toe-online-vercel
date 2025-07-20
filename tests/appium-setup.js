#!/usr/bin/env node

const { spawn } = require('child_process');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Appium for mobile E2E testing...\n');

// Check if Appium is installed
function checkAppiumInstallation() {
    try {
        execSync('appium --version', { stdio: 'pipe' });
        console.log('✅ Appium is installed');
        return true;
    } catch (error) {
        console.log('❌ Appium is not installed');
        console.log('📦 Install Appium with: npm install -g appium');
        console.log('📦 Install drivers with:');
        console.log('   appium driver install xcuitest');
        console.log('   appium driver install uiautomator2');
        return false;
    }
}

// Check device connections
function checkDeviceConnections() {
    console.log('\n📱 Checking mobile device connections...');

    // Check iOS devices
    try {
        const iosDevices = execSync('xcrun simctl list devices available', { encoding: 'utf8' });
        const availableIOS = iosDevices.includes('iPhone') || iosDevices.includes('iPad');
        console.log(availableIOS ? '✅ iOS devices available' : '⚠️ No iOS devices found');
    } catch (error) {
        console.log('⚠️ iOS device check failed (Xcode tools may not be installed)');
    }

    // Check Android devices
    try {
        const androidDevices = execSync('adb devices', { encoding: 'utf8' });
        const connectedAndroid = androidDevices.includes('device') && !androidDevices.includes('List of devices attached\n\n');
        console.log(connectedAndroid ? '✅ Android devices connected' : '⚠️ No Android devices connected');

        if (!connectedAndroid) {
            console.log('💡 To connect Android devices:');
            console.log('   1. Enable Developer Options and USB Debugging');
            console.log('   2. Connect device via USB');
            console.log('   3. Run: adb devices');
        }
    } catch (error) {
        console.log('⚠️ Android device check failed (ADB may not be installed)');
    }
}

// Start Appium servers
function startAppiumServers() {
    console.log('\n🔄 Starting Appium servers...');

    // Server 1 for iOS (port 4723)
    const appiumServer1 = spawn('appium', [
        '--port', '4723',
        '--session-override',
        '--log-level', 'info',
        '--relaxed-security',
        '--allow-cors'
    ], {
        stdio: 'pipe',
        detached: false
    });

    appiumServer1.stdout.on('data', (data) => {
        console.log(`📱 iOS Server: ${data.toString().trim()}`);
    });

    appiumServer1.stderr.on('data', (data) => {
        const message = data.toString().trim();
        if (!message.includes('deprecated') && !message.includes('warning')) {
            console.error(`📱 iOS Server Error: ${message}`);
        }
    });

    // Server 2 for Android (port 4724)
    const appiumServer2 = spawn('appium', [
        '--port', '4724',
        '--session-override',
        '--log-level', 'info',
        '--relaxed-security',
        '--allow-cors'
    ], {
        stdio: 'pipe',
        detached: false
    });

    appiumServer2.stdout.on('data', (data) => {
        console.log(`🤖 Android Server: ${data.toString().trim()}`);
    });

    appiumServer2.stderr.on('data', (data) => {
        const message = data.toString().trim();
        if (!message.includes('deprecated') && !message.includes('warning')) {
            console.error(`🤖 Android Server Error: ${message}`);
        }
    });

    // Handle server shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down Appium servers...');
        appiumServer1.kill();
        appiumServer2.kill();
        process.exit(0);
    });

    console.log('✅ Appium servers started on ports 4723 (iOS) and 4724 (Android)');
    console.log('🔄 Servers will run until you press Ctrl+C');

    return { appiumServer1, appiumServer2 };
}

// Create mobile device configuration
function createMobileConfig() {
    const configPath = path.join(__dirname, 'mobile-config.json');

    const config = {
        ios: {
            platformName: 'iOS',
            platformVersion: '16.0',
            deviceName: 'iPhone 14',
            browserName: 'Safari',
            automationName: 'XCUITest',
            newCommandTimeout: 300,
            port: 4723
        },
        android: {
            platformName: 'Android',
            platformVersion: '13.0',
            deviceName: 'Pixel 7',
            browserName: 'Chrome',
            automationName: 'UiAutomator2',
            newCommandTimeout: 300,
            port: 4724
        },
        production: {
            url: 'https://tic-tac-toe-online-vercel-nazyusl2d-cryptomans-projects.vercel.app',
            timeout: 30000
        }
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`📄 Mobile config created at: ${configPath}`);
}

// Main setup function
async function setupAppium() {
    try {
        console.log('🔧 Appium Mobile Testing Setup\n');

        // Check prerequisites
        if (!checkAppiumInstallation()) {
            process.exit(1);
        }

        // Check device connections
        checkDeviceConnections();

        // Create mobile configuration
        createMobileConfig();

        // Ask user if they want to start servers
        console.log('\n❓ Do you want to start Appium servers now? (y/n)');

        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (input) => {
            const answer = input.trim().toLowerCase();

            if (answer === 'y' || answer === 'yes') {
                startAppiumServers();
            } else {
                console.log('✅ Setup complete. Start servers manually when ready:');
                console.log('   appium --port 4723 (for iOS)');
                console.log('   appium --port 4724 (for Android)');
                process.exit(0);
            }
        });

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

// Doctor check function
function runAppiumDoctor() {
    console.log('🏥 Running Appium Doctor to check setup...\n');

    try {
        const doctorOutput = execSync('appium doctor --android --ios', {
            encoding: 'utf8',
            stdio: 'pipe'
        });
        console.log(doctorOutput);
    } catch (error) {
        console.log('⚠️ Appium Doctor not available or setup incomplete');
        console.log('📦 Install with: npm install -g appium-doctor');
    }
}

// Export functions for use in tests
module.exports = {
    checkAppiumInstallation,
    checkDeviceConnections,
    startAppiumServers,
    createMobileConfig,
    runAppiumDoctor
};

// Run setup if called directly
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--doctor')) {
        runAppiumDoctor();
    } else if (args.includes('--start-servers')) {
        if (checkAppiumInstallation()) {
            startAppiumServers();
        }
    } else {
        setupAppium();
    }
} 