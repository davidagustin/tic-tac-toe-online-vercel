#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Test screenshot patterns to remove
const screenshotPatterns = [
    // Production test screenshots
    'p1-after-create.png',
    'p2-join-attempt.png',
    'p1-game-not-started.png',
    'p2-game-not-started.png',
    'move-*-failed.png',
    'move-*-error.png',
    'final-error-p1.png',
    'final-error-p2.png',
    'simple-error-p1.png',
    'simple-error-p2.png',
    'demo-error-p1.png',
    'demo-error-p2.png',

    // Mobile test screenshots
    'final-game-user1-start.png',
    'final-game-user2-start.png',
    'final-move-*-x.png',
    'final-move-*-o.png',
    'final-game-complete-user1.png',
    'final-game-complete-user2.png',
    'final-logout-complete-user1.png',
    'final-logout-complete-user2.png',
    'guaranteed-game-user1.png',
    'guaranteed-game-user2.png',
    'guaranteed-move-*-x.png',
    'guaranteed-move-*-o.png',
    'guaranteed-final-user1.png',
    'guaranteed-final-user2.png',

    // Ably test screenshots
    'ably-user1-error.png',
    'ably-user2-error.png',
    'user1-error.png',
    'user2-error.png',

    // Debug screenshots
    'production-error-debug.png',
    'debug-mobile-login.png',
    'debug-mobile-lobby.png',
    'debug-mobile-after-create.png',
    'debug-mobile-error.png',

    // Browser device simulation screenshots
    'browser-device-ios-start.png',
    'browser-device-android-start.png',
    'browser-device-move-*-x.png',
    'browser-device-move-*-o.png',
    'browser-device-game-complete-ios.png',
    'browser-device-game-complete-android.png',
    'browser-device-stats-ios.png',
    'browser-device-stats-android.png',
    'browser-device-final-ios.png',
    'browser-device-final-android.png',

    // Mobile working test screenshots
    'user1-before-create.png',
    'user1-after-create.png',
    'user2-before-join.png',
    'user2-after-join.png',
    'user1-game-state.png',
    'user2-game-state.png',
    'user2-after-join.png',
    'user2-before-join.png',
    'user1-after-create.png',
    'user1-before-create.png',

    // Game test screenshots
    'game-test-join-after.png',
    'game-test-join-before.png',
    'game-test-create-after.png',
    'game-test-create-before.png',
    'game-board-search-user 1 (x).png',
    'game-board-search-user 2 (o).png',

    // Stability test screenshots
    'stability-game-user1-start.png',
    'stability-game-user2-start.png'
];

function cleanupScreenshots() {
    console.log('🧹 Cleaning up test screenshots...');

    const rootDir = process.cwd();
    let removedCount = 0;
    let totalSize = 0;

    // Get all PNG files in the root directory
    const files = fs.readdirSync(rootDir);

    files.forEach(file => {
        if (file.endsWith('.png')) {
            const filePath = path.join(rootDir, file);
            const stats = fs.statSync(filePath);

            // Check if this file matches any of our patterns
            const shouldRemove = screenshotPatterns.some(pattern => {
                // Convert pattern to regex for wildcard matching
                const regexPattern = pattern.replace(/\*/g, '.*');
                const regex = new RegExp(`^${regexPattern}$`);
                return regex.test(file);
            });

            if (shouldRemove) {
                try {
                    fs.unlinkSync(filePath);
                    removedCount++;
                    totalSize += stats.size;
                    console.log(`✅ Removed: ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
                } catch (error) {
                    console.log(`❌ Failed to remove ${file}: ${error.message}`);
                }
            }
        }
    });

    console.log('\n📊 Cleanup Summary:');
    console.log(`✅ Files removed: ${removedCount}`);
    console.log(`💾 Space freed: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

    if (removedCount === 0) {
        console.log('ℹ️ No test screenshots found to remove');
    }
}

// Run cleanup if this script is executed directly
if (require.main === module) {
    cleanupScreenshots();
}

module.exports = cleanupScreenshots; 