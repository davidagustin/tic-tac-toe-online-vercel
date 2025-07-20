#!/usr/bin/env node

// Force cleanup script - clears all possible game storage locations
console.log('🧹 FORCE CLEANUP: Clearing all game storage locations...');

// 1. Clear in-memory storage from game-storage.ts
try {
  const { games, getAllGames, deleteGame } = require('../lib/game-storage.ts');
  
  console.log('📊 Step 1: Clearing lib/game-storage.ts games...');
  const allGames = getAllGames();
  console.log(`📊 Found ${allGames.length} games in game-storage.ts`);
  
  let clearedCount = 0;
  for (const [gameId, game] of games.entries()) {
    console.log(`🧹 Deleting game: ${gameId} (${game.name})`);
    deleteGame(gameId);
    clearedCount++;
  }
  console.log(`✅ Cleared ${clearedCount} games from game-storage.ts`);
} catch (error) {
  console.log('⚠️ Could not clear game-storage.ts:', error.message);
}

// 2. Clear database games
try {
  console.log('📊 Step 2: Clearing database games...');
  const { Pool } = require('pg');
  
  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
    
    const client = await pool.connect();
    
    // Clear games table
    const result = await client.query('DELETE FROM games');
    console.log(`✅ Cleared ${result.rowCount} games from database`);
    
    // Clear game chat messages
    const chatResult = await client.query('DELETE FROM game_chat_messages');
    console.log(`✅ Cleared ${chatResult.rowCount} game chat messages from database`);
    
    client.release();
    await pool.end();
  } else {
    console.log('⚠️ No DATABASE_URL found, skipping database cleanup');
  }
} catch (error) {
  console.log('⚠️ Could not clear database:', error.message);
}

// 3. Clear any other potential storage
console.log('📊 Step 3: Checking for other storage locations...');

// Check if there are any other game Maps in the codebase
const fs = require('fs');
const path = require('path');

function findGameMaps(dir) {
  const files = fs.readdirSync(dir);
  let found = [];
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      found = found.concat(findGameMaps(filePath));
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('games = new Map()') || content.includes('const games = new Map()')) {
          found.push(filePath);
        }
      } catch (error) {
        // Ignore read errors
      }
    }
  }
  
  return found;
}

const gameMapFiles = findGameMaps('.');
console.log('📊 Found potential game Map files:', gameMapFiles);

// 4. Clear browser storage (if running in browser context)
console.log('📊 Step 4: Browser storage cleanup instructions...');
console.log('💡 To clear browser storage, run this in the browser console:');
console.log('   localStorage.clear();');
console.log('   sessionStorage.clear();');

// 5. Clear Pusher state (instructions)
console.log('📊 Step 5: Pusher state cleanup...');
console.log('💡 To clear Pusher state, refresh the page or restart the app');

console.log('\n🎉 FORCE CLEANUP COMPLETED!');
console.log('📝 Next steps:');
console.log('   1. Restart the development server');
console.log('   2. Clear browser cache and storage');
console.log('   3. Refresh the page');
console.log('   4. Check that no orphaned games appear'); 