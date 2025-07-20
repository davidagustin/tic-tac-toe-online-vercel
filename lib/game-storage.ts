import { db } from './db';

// Shared in-memory storage for games (fallback and primary for now)
export const games = new Map();

export interface Game {
  id: string;
  name: string;
  players: string[];
  status: 'waiting' | 'playing' | 'finished';
  createdBy: string;
  createdAt: Date;
  board: (string | null)[];
  currentPlayer: 'X' | 'O' | null;
  winner: string | null;
}

export async function getGame(gameId: string): Promise<Game | undefined> {
  try {
    console.log('🔍 Getting game from database:', gameId);

    // First try in-memory cache for speed
    const memoryGame = games.get(gameId);
    if (memoryGame) {
      console.log('✅ Game found in memory cache:', gameId);
      return memoryGame;
    }

    // Then try database
    const result = await db.query(
      `SELECT g.*, 
              u1.username as player1_username,
              u2.username as player2_username,
              winner.username as winner_username
       FROM games g
       LEFT JOIN users u1 ON g.player1_id = u1.id
       LEFT JOIN users u2 ON g.player2_id = u2.id
       LEFT JOIN users winner ON g.winner_id = winner.id
       WHERE g.game_id = $1`,
      [gameId]
    );

    if (result.rows.length === 0) {
      console.log('❌ Game not found in database or memory:', gameId);
      return undefined;
    }

    const row = result.rows[0];
    const players = [];
    if (row.player1_username) players.push(row.player1_username);
    if (row.player2_username) players.push(row.player2_username);

    const game: Game = {
      id: row.game_id,
      name: row.game_id, // Use game_id as name for now
      players: players,
      status: row.game_status,
      createdBy: row.player1_username || 'unknown',
      createdAt: row.created_at,
      board: row.board_state || Array(9).fill(null),
      currentPlayer: row.current_player_id ?
        (players.indexOf(row.player1_username) === 0 ? 'X' : 'O') : null,
      winner: row.winner_username || null
    };

    // Cache in memory for future requests
    games.set(gameId, game);

    console.log('✅ Game found in database and cached:', JSON.stringify(game, null, 2));
    return game;
  } catch (error) {
    console.error('❌ Error getting game from database:', error);
    // Fallback to in-memory storage only
    console.log('🔄 Using in-memory storage only');
    return games.get(gameId);
  }
}

export async function setGame(gameId: string, game: Game): Promise<void> {
  try {
    console.log('💾 Saving game:', gameId);

    // Always store in memory first (primary storage for now)
    games.set(gameId, game);
    console.log('✅ Game stored in memory cache');

    // Try to also store in database for persistence
    try {
      // Get user IDs for players
      const userQueries = game.players.map(username =>
        db.query('SELECT id FROM users WHERE username = $1', [username])
      );

      const userResults = await Promise.all(userQueries);
      const userIds = userResults.map(result =>
        result.rows.length > 0 ? result.rows[0].id : null
      );

      const player1Id = userIds[0];
      const player2Id = userIds[1] || null;

      // Determine current player ID
      let currentPlayerId = null;
      if (game.currentPlayer && game.players.length > 0) {
        const currentPlayerIndex = game.currentPlayer === 'X' ? 0 : 1;
        currentPlayerId = userIds[currentPlayerIndex] || null;
      }

      // Get winner ID if winner exists
      let winnerId = null;
      if (game.winner) {
        const winnerResult = await db.query('SELECT id FROM users WHERE username = $1', [game.winner]);
        winnerId = winnerResult.rows.length > 0 ? winnerResult.rows[0].id : null;
      }

      // Insert or update game in database
      await db.query(
        `INSERT INTO games (game_id, player1_id, player2_id, current_player_id, board_state, game_status, winner_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
         ON CONFLICT (game_id) 
         DO UPDATE SET 
           player2_id = COALESCE(EXCLUDED.player2_id, games.player2_id),
           current_player_id = EXCLUDED.current_player_id,
           board_state = EXCLUDED.board_state,
           game_status = EXCLUDED.game_status,
           winner_id = EXCLUDED.winner_id,
           updated_at = CURRENT_TIMESTAMP`,
        [gameId, player1Id, player2Id, currentPlayerId, JSON.stringify(game.board), game.status, winnerId, game.createdAt]
      );

      console.log('✅ Game also saved to database for persistence');
    } catch (dbError) {
      console.error('⚠️ Database save failed, but memory storage successful:', dbError);
      // This is fine - memory storage is working
    }

  } catch (error) {
    console.error('❌ Error saving game:', error);
    // Even if everything fails, try basic memory storage
    games.set(gameId, game);
  }
}

export async function deleteGame(gameId: string): Promise<boolean> {
  try {
    console.log('🗑️ Deleting game:', gameId);

    // Remove from memory
    const memoryDeleted = games.delete(gameId);

    // Try to remove from database
    try {
      const result = await db.query('DELETE FROM games WHERE game_id = $1', [gameId]);
      console.log(`✅ Game deleted from database (${(result.rowCount || 0)} rows)`);
    } catch (dbError) {
      console.error('⚠️ Database deletion failed:', dbError);
    }

    return memoryDeleted;
  } catch (error) {
    console.error('❌ Error deleting game:', error);
    return games.delete(gameId);
  }
}

export async function getAllGames(): Promise<Game[]> {
  try {
    console.log('📋 Getting all games');

    // Clean up old games first
    await cleanupOldGames();

    // Return games from memory (primary storage)
    const gamesList = Array.from(games.values());
    console.log(`✅ Retrieved ${gamesList.length} games from memory`);

    return gamesList;
  } catch (error) {
    console.error('❌ Error getting games:', error);
    return Array.from(games.values());
  }
}

// Clean up games older than 1 hour or finished games older than 10 minutes
export async function cleanupOldGames(): Promise<void> {
  try {
    console.log('🧹 Cleaning up old games');

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const gamesToDelete: string[] = [];

    for (const [gameId, game] of games.entries()) {
      const gameCreatedAt = new Date(game.createdAt);

      if (gameCreatedAt < oneHourAgo) {
        gamesToDelete.push(gameId);
      } else if (game.status === 'finished' && gameCreatedAt < tenMinutesAgo) {
        gamesToDelete.push(gameId);
      }
    }

    for (const gameId of gamesToDelete) {
      games.delete(gameId);
    }

    if (gamesToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${gamesToDelete.length} old games`);
    }

    // Also try to clean up database
    try {
      const result = await db.query(
        `DELETE FROM games 
         WHERE created_at < $1 
         OR (game_status = 'finished' AND created_at < $2)`,
        [oneHourAgo, tenMinutesAgo]
      );
      if ((result.rowCount || 0) > 0) {
        console.log(`🧹 Also cleaned up ${result.rowCount || 0} old games from database`);
      }
    } catch (dbError) {
      console.error('⚠️ Database cleanup failed:', dbError);
    }
  } catch (error) {
    console.error('❌ Error cleaning up games:', error);
  }
}

// Cleanup games with inactive users
export async function cleanupInactiveUsers(): Promise<void> {
  try {
    console.log('🧹 Cleaning up inactive games');

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const inactiveGames: string[] = [];

    for (const [gameId, game] of games.entries()) {
      const gameCreatedAt = new Date(game.createdAt);
      if (game.status === 'waiting' && gameCreatedAt < thirtyMinutesAgo) {
        inactiveGames.push(gameId);
      }
    }

    for (const gameId of inactiveGames) {
      games.delete(gameId);
    }

    if (inactiveGames.length > 0) {
      console.log(`🧹 Cleaned up ${inactiveGames.length} inactive games`);
    }
  } catch (error) {
    console.error('❌ Error cleaning up inactive games:', error);
  }
} 