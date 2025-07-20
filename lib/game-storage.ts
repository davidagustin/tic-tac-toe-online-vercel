import { db } from './db';

// Shared in-memory storage for games (fallback only)
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
      console.log('❌ Game not found in database:', gameId);
      return undefined;
    }

    const row = result.rows[0];
    const players = [];
    if (row.player1_username) players.push(row.player1_username);
    if (row.player2_username) players.push(row.player2_username);

    const game: Game = {
      id: row.game_id,
      name: row.game_id, // We'll use game_id as name for now
      players: players,
      status: row.game_status,
      createdBy: row.player1_username || 'unknown',
      createdAt: row.created_at,
      board: row.board_state || Array(9).fill(null),
      currentPlayer: row.current_player_id ? (players.indexOf(row.player1_username) === (row.current_player_id === row.player1_id ? 0 : 1) ? 'X' : 'O') : null,
      winner: row.winner_username || null
    };

    console.log('✅ Game found in database:', JSON.stringify(game, null, 2));
    return game;
  } catch (error) {
    console.error('❌ Error getting game from database:', error);
    // Fallback to in-memory storage
    console.log('🔄 Falling back to in-memory storage');
    return games.get(gameId);
  }
}

export async function setGame(gameId: string, game: Game): Promise<void> {
  try {
    console.log('💾 Saving game to database:', gameId, JSON.stringify(game, null, 2));

    // Get user IDs for players
    const userIds = await Promise.all(
      game.players.map(async (username) => {
        const result = await db.query('SELECT id FROM users WHERE username = $1', [username]);
        return result.rows.length > 0 ? result.rows[0].id : null;
      })
    );

    const player1Id = userIds[0];
    const player2Id = userIds[1] || null;

    // Determine current player ID
    let currentPlayerId = null;
    if (game.currentPlayer && game.players.length > 0) {
      const currentPlayerIndex = game.currentPlayer === 'X' ? 0 : 1;
      currentPlayerId = userIds[currentPlayerIndex] || null;
    }

    // Get winner ID
    let winnerId = null;
    if (game.winner) {
      const winnerResult = await db.query('SELECT id FROM users WHERE username = $1', [game.winner]);
      winnerId = winnerResult.rows.length > 0 ? winnerResult.rows[0].id : null;
    }

    // Insert or update game
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

    console.log('✅ Game saved to database successfully');

    // Also store in memory as cache
    games.set(gameId, game);
  } catch (error) {
    console.error('❌ Error saving game to database:', error);
    // Fallback to in-memory storage
    console.log('🔄 Falling back to in-memory storage');
    games.set(gameId, game);
  }
}

export async function deleteGame(gameId: string): Promise<boolean> {
  try {
    console.log('🗑️ Deleting game from database:', gameId);

    const result = await db.query('DELETE FROM games WHERE game_id = $1', [gameId]);

    // Also remove from memory
    games.delete(gameId);

    console.log('✅ Game deleted from database');
    return (result.rowCount || 0) > 0;
  } catch (error) {
    console.error('❌ Error deleting game from database:', error);
    // Fallback to in-memory deletion
    return games.delete(gameId);
  }
}

export async function getAllGames(): Promise<Game[]> {
  try {
    console.log('📋 Getting all games from database');

    // Clean up old games first
    await cleanupOldGames();

    const result = await db.query(
      `SELECT g.*, 
              u1.username as player1_username,
              u2.username as player2_username,
              winner.username as winner_username
       FROM games g
       LEFT JOIN users u1 ON g.player1_id = u1.id
       LEFT JOIN users u2 ON g.player2_id = u2.id
       LEFT JOIN users winner ON g.winner_id = winner.id
       ORDER BY g.created_at DESC`
    );

    const gamesList = result.rows.map(row => {
      const players = [];
      if (row.player1_username) players.push(row.player1_username);
      if (row.player2_username) players.push(row.player2_username);

      return {
        id: row.game_id,
        name: row.game_id,
        players: players,
        status: row.game_status,
        createdBy: row.player1_username || 'unknown',
        createdAt: row.created_at,
        board: row.board_state || Array(9).fill(null),
        currentPlayer: row.current_player_id ? (players.indexOf(row.player1_username) === (row.current_player_id === row.player1_id ? 0 : 1) ? 'X' : 'O') : null,
        winner: row.winner_username || null
      } as Game;
    });

    console.log(`✅ Retrieved ${gamesList.length} games from database`);
    return gamesList;
  } catch (error) {
    console.error('❌ Error getting games from database:', error);
    // Fallback to in-memory storage
    console.log('🔄 Falling back to in-memory storage');
    cleanupOldGames();
    return Array.from(games.values());
  }
}

// Clean up games older than 1 hour or finished games older than 10 minutes
export async function cleanupOldGames(): Promise<void> {
  try {
    console.log('🧹 Cleaning up old games from database');

    const result = await db.query(
      `DELETE FROM games 
       WHERE created_at < $1 
       OR (game_status = 'finished' AND created_at < $2)`,
      [
        new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        new Date(Date.now() - 10 * 60 * 1000)  // 10 minutes ago
      ]
    );

    if ((result.rowCount || 0) > 0) {
      console.log(`🧹 Cleaned up ${result.rowCount || 0} old games from database`);
    }
  } catch (error) {
    console.error('❌ Error cleaning up games from database:', error);
    // Fallback to in-memory cleanup
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
      console.log(`🧹 Cleaned up ${gamesToDelete.length} old games from memory`);
    }
  }
}

// Cleanup games with inactive users
export async function cleanupInactiveUsers(): Promise<void> {
  try {
    console.log('🧹 Cleaning up games with inactive users from database');

    // For now, we'll implement basic cleanup
    // In a real implementation, you'd track last activity time per player
    const result = await db.query(
      `DELETE FROM games 
       WHERE game_status = 'waiting' 
       AND created_at < $1`,
      [new Date(Date.now() - 30 * 60 * 1000)] // 30 minutes ago
    );

    if ((result.rowCount || 0) > 0) {
      console.log(`🧹 Cleaned up ${result.rowCount || 0} inactive games from database`);
    }
  } catch (error) {
    console.error('❌ Error cleaning up inactive users from database:', error);
  }
} 