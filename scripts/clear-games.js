#!/usr/bin/env node

// Simple script to clear all games from in-memory storage
// This can be run to clean up orphaned games

console.log('🧹 Clearing all games from in-memory storage...');

// Import the game storage
const { games, getAllGames, deleteGame } = require('../lib/game-storage.ts');

// Get all current games
const allGames = getAllGames();
console.log(`📊 Found ${allGames.length} games in storage:`);

allGames.forEach(game => {
  console.log(`  - ${game.id}: ${game.name} (${game.status}) - Players: ${game.players.join(', ')}`);
});

// Clear all games
let clearedCount = 0;
for (const [gameId, game] of games.entries()) {
  console.log(`🧹 Deleting game: ${gameId} (${game.name})`);
  deleteGame(gameId);
  clearedCount++;
}

console.log(`✅ Cleared ${clearedCount} games from storage`);

// Verify games are cleared
const remainingGames = getAllGames();
console.log(`📊 Remaining games: ${remainingGames.length}`);

if (remainingGames.length === 0) {
  console.log('🎉 All games successfully cleared!');
} else {
  console.log('⚠️ Some games may still remain');
} 