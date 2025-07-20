#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function cleanupDebugLogs() {
    console.log('🧹 Cleaning up old debug logs...');

    const debugLogsDir = path.join(process.cwd(), 'debug-logs');

    if (!fs.existsSync(debugLogsDir)) {
        console.log('ℹ️ No debug-logs directory found');
        return;
    }

    const files = fs.readdirSync(debugLogsDir);
    let removedCount = 0;
    let totalSize = 0;

    // Keep logs from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    files.forEach(file => {
        const filePath = path.join(debugLogsDir, file);
        const stats = fs.statSync(filePath);

        // Check if file is older than 7 days
        if (stats.mtime < sevenDaysAgo) {
            try {
                fs.unlinkSync(filePath);
                removedCount++;
                totalSize += stats.size;
                console.log(`✅ Removed: ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
            } catch (error) {
                console.log(`❌ Failed to remove ${file}: ${error.message}`);
            }
        }
    });

    console.log('\n📊 Debug Logs Cleanup Summary:');
    console.log(`✅ Files removed: ${removedCount}`);
    console.log(`💾 Space freed: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

    if (removedCount === 0) {
        console.log('ℹ️ No old debug logs found to remove');
    }
}

// Run cleanup if this script is executed directly
if (require.main === module) {
    cleanupDebugLogs();
}

module.exports = cleanupDebugLogs; 