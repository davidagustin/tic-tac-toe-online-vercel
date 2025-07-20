#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('📱🤖 Setting up Real Device Testing Environment');
console.log('='.repeat(60));

// Check if Appium is installed
try {
    execSync('appium --version', { stdio: 'pipe' });
    console.log('✅ Appium is installed');
} catch (error) {
    console.log('❌ Appium not found. Installing...');
    try {
        execSync('npm install -g appium', { stdio: 'inherit' });
        console.log('✅ Appium installed successfully');
    } catch (installError) {
        console.log('❌ Failed to install Appium:', installError.message);
        process.exit(1);
    }
}

// Install Appium drivers
console.log('\n🔧 Installing Appium drivers...');
try {
    execSync('appium driver install xcuitest', { stdio: 'inherit' });
    execSync('appium driver install uiautomator2', { stdio: 'inherit' });
    console.log('✅ Appium drivers installed');
} catch (error) {
    console.log('⚠️ Driver installation issue:', error.message);
}

// Check for connected devices
console.log('\n📱 Checking for connected devices...');

try {
    // Check iOS devices
    const iosDevices = execSync('xcrun devicectl list devices', { encoding: 'utf8' });
    console.log('📱 iOS devices found:');
    console.log(iosDevices);
} catch (error) {
    console.log('⚠️ iOS device check failed:', error.message);
}

try {
    // Check Android devices
    const androidDevices = execSync('adb devices', { encoding: 'utf8' });
    console.log('🤖 Android devices found:');
    console.log(androidDevices);
} catch (error) {
    console.log('⚠️ Android device check failed:', error.message);
}

console.log('\n📋 Setup Instructions:');
console.log('1. Connect your iOS device via USB');
console.log('2. Connect your Android device via USB');
console.log('3. Enable Developer Mode on both devices');
console.log('4. Trust the computer on iOS device');
console.log('5. Enable USB debugging on Android device');
console.log('6. Set environment variables:');
console.log('   export IOS_UDID="your-ios-device-udid"');
console.log('   export ANDROID_UDID="your-android-device-udid"');
console.log('7. Run: node tests/real-device-stability-test.js');

console.log('\n🚀 Ready to run real device tests!'); 