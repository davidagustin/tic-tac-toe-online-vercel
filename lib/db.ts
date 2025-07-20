import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const db = {
  query: (text: string, params?: unknown[]) => pool.query(text, params),
  getClient: () => pool.connect(),
};

// Database utility functions
export async function query(text: string, params?: unknown[]) {
  return pool.query(text, params);
}

export async function getClient() {
  return pool.connect();
}

// Chat functions
export async function getLobbyMessages() {
  const result = await pool.query(
    'SELECT * FROM lobby_chat_messages ORDER BY timestamp DESC LIMIT 50'
  );
  return result.rows;
}

export async function saveLobbyMessage(userId: number, username: string, message: string) {
  const result = await pool.query(
    'INSERT INTO lobby_chat_messages (user_id, username, message) VALUES ($1, $2, $3) RETURNING *',
    [userId, username, message]
  );
  return result.rows[0];
}

export async function getGameMessages(gameId: string) {
  const result = await pool.query(
    'SELECT * FROM game_chat_messages WHERE game_id = $1 ORDER BY timestamp DESC LIMIT 50',
    [gameId]
  );
  return result.rows;
}

export async function saveGameMessage(gameId: string, userId: number, username: string, message: string) {
  const result = await pool.query(
    'INSERT INTO game_chat_messages (game_id, user_id, username, message) VALUES ($1, $2, $3, $4) RETURNING *',
    [gameId, userId, username, message]
  );
  return result.rows[0];
}

// Game statistics functions
export async function getUserStatistics(userName: string) {
  const result = await pool.query(`
    SELECT gs.*, u.username 
    FROM game_statistics gs 
    JOIN users u ON gs.user_id = u.id 
    WHERE u.username = $1
  `, [userName]);
  return result.rows[0];
}

export async function updateGameStatistics(userId: number, result: 'win' | 'loss' | 'draw') {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get current statistics
    const currentStats = await client.query(
      'SELECT * FROM game_statistics WHERE user_id = $1',
      [userId]
    );

    if (currentStats.rows.length === 0) {
      // Create new statistics record
      await client.query(
        'INSERT INTO game_statistics (user_id, games_played, games_won, games_lost, games_drawn) VALUES ($1, 1, $2, $3, $4)',
        [
          userId,
          result === 'win' ? 1 : 0,
          result === 'loss' ? 1 : 0,
          result === 'draw' ? 1 : 0
        ]
      );
    } else {
      // Update existing statistics
      const _stats = currentStats.rows[0];
      await client.query(
        'UPDATE game_statistics SET games_played = games_played + 1, games_won = games_won + $1, games_lost = games_lost + $2, games_drawn = games_drawn + $3, updated_at = CURRENT_TIMESTAMP WHERE user_id = $4',
        [
          result === 'win' ? 1 : 0,
          result === 'loss' ? 1 : 0,
          result === 'draw' ? 1 : 0,
          userId
        ]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Health check function
export async function checkDatabaseHealth() {
  const startTime = Date.now();
  try {
    const _result = await pool.query('SELECT 1 as health_check');
    const latency = Date.now() - startTime;
    return { status: 'healthy' as const, timestamp: new Date().toISOString(), latency };
  } catch (error) {
    const latency = Date.now() - startTime;
    return { status: 'unhealthy' as const, error: error instanceof Error ? error.message : 'Unknown error', latency };
  }
}

// Database initialization function
export async function initializeDatabase() {
  try {
    const client = await pool.connect();

    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'games', 'lobby_chat_messages', 'game_chat_messages', 'game_statistics')
    `);

    const existingTables = tablesResult.rows.map(row => row.table_name);
    console.log('Existing tables:', existingTables);

    client.release();
    return { success: true, tables: existingTables };
  } catch (error) {
    console.error('Database initialization error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
} 