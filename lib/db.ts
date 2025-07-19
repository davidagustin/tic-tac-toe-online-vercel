import { Pool, PoolClient, PoolConfig } from 'pg';
import { AuthService } from './auth';

// Database configuration with best practices
const getDatabaseConfig = (): PoolConfig => {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return {
    connectionString,
    // Connection pool settings
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
    ssl: process.env.NODE_ENV === 'production' 
      ? { 
          rejectUnauthorized: false
        } 
      : false,
    // Statement timeout
    statement_timeout: 30000, // 30 seconds
    // Query timeout
    query_timeout: 30000, // 30 seconds
    // Application name for monitoring
    application_name: 'tic-tac-toe-app',
  };
};

// Create connection pool with error handling
let pool: Pool | null = null;

const createPool = (): Pool => {
  try {
    const config = getDatabaseConfig();
    const newPool = new Pool(config);
    
    // Handle pool errors
    newPool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });

    // Handle connect errors
    newPool.on('connect', (client) => {
      client.on('error', (err) => {
        console.error('Database client error:', err);
      });
    });

    return newPool;
  } catch (error) {
    console.error('Failed to create database pool:', error);
    throw error;
  }
};

// Initialize pool
const initializePool = (): Pool => {
  if (!pool) {
    pool = createPool();
  }
  return pool;
};

// Get pool instance
const getPool = (): Pool => {
  if (!pool) {
    return initializePool();
  }
  return pool;
};

// Enhanced connection management
export async function createConnection(): Promise<PoolClient | null> {
  try {
    const poolInstance = getPool();
    const client = await poolInstance.connect();
    
    // Set session-level settings
    await client.query('SET statement_timeout = 30000');
    await client.query('SET query_timeout = 30000');
    
    return client;
  } catch (error) {
    console.error('Failed to create database connection:', error);
    return null;
  }
}

// Enhanced query function with retry logic and better error handling
export async function query(sql: string, params?: any[], retries: number = 3): Promise<any[]> {
  const poolInstance = getPool();
  let client: PoolClient | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      client = await poolInstance.connect();
      
      const startTime = Date.now();
      const result = await client.query(sql, params);
      const duration = Date.now() - startTime;
      
      // Log slow queries
      if (duration > 1000) {
        console.warn(`Slow query detected (${duration}ms):`, sql.substring(0, 100));
      }
      
      return result.rows;
    } catch (error) {
      console.error(`Database query error (attempt ${attempt}/${retries}):`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        sql: sql.substring(0, 100),
        params: params?.slice(0, 3), // Log first 3 params for debugging
      });
      
      if (attempt === retries) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
    } finally {
      if (client) {
        client.release();
      }
    }
  }
  
  return [];
}

// Transaction helper
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const poolInstance = getPool();
  const client = await poolInstance.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Health check function
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  latency: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    await query('SELECT 1 as health_check');
    const latency = Date.now() - startTime;
    
    return {
      status: 'healthy',
      latency,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Graceful shutdown
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Initialize database with the required tables
export async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Test connection first
    const health = await checkDatabaseHealth();
    if (health.status === 'unhealthy') {
      throw new Error(`Database health check failed: ${health.error}`);
    }
    
    console.log(`Database connection healthy (${health.latency}ms)`);

    // Create lobby chat messages table with better constraints
    await query(`
      CREATE TABLE IF NOT EXISTS lobby_chat_messages (
        id SERIAL PRIMARY KEY,
        text VARCHAR(500) NOT NULL CHECK (length(trim(text)) > 0),
        user_name VARCHAR(100) NOT NULL CHECK (length(trim(user_name)) > 0),
        timestamp TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create game-specific chat messages table
    await query(`
      CREATE TABLE IF NOT EXISTS game_chat_messages (
        id SERIAL PRIMARY KEY,
        game_id VARCHAR(100) NOT NULL CHECK (length(trim(game_id)) > 0),
        text VARCHAR(500) NOT NULL CHECK (length(trim(text)) > 0),
        user_name VARCHAR(100) NOT NULL CHECK (length(trim(user_name)) > 0),
        timestamp TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create game statistics table with better constraints
    await query(`
      CREATE TABLE IF NOT EXISTS game_statistics (
        id SERIAL PRIMARY KEY,
        user_name VARCHAR(100) UNIQUE NOT NULL CHECK (length(trim(user_name)) > 0),
        wins INTEGER DEFAULT 0 CHECK (wins >= 0),
        losses INTEGER DEFAULT 0 CHECK (losses >= 0),
        draws INTEGER DEFAULT 0 CHECK (draws >= 0),
        total_games INTEGER DEFAULT 0 CHECK (total_games >= 0),
        win_rate DECIMAL(5,2) GENERATED ALWAYS AS (
          CASE 
            WHEN total_games = 0 THEN 0 
            ELSE ROUND((wins::DECIMAL / total_games) * 100, 2)
          END
        ) STORED,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create optimized indexes for better performance
    await query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lobby_chat_timestamp 
      ON lobby_chat_messages(timestamp DESC);
    `);
    
    await query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_chat_game_id 
      ON game_chat_messages(game_id);
    `);
    
    await query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_chat_timestamp 
      ON game_chat_messages(timestamp DESC);
    `);

    await query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_stats_user_name 
      ON game_statistics(user_name);
    `);

    await query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_stats_win_rate 
      ON game_statistics(win_rate DESC);
    `);

    // Create users table for authentication with better constraints
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL CHECK (length(trim(username)) >= 3),
        password VARCHAR(255) NOT NULL CHECK (length(password) >= 8),
        email VARCHAR(255) UNIQUE,
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create games table for better game management
    await query(`
      CREATE TABLE IF NOT EXISTS games (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
        current_player VARCHAR(10) CHECK (current_player IN ('X', 'O')),
        board JSONB DEFAULT '["", "", "", "", "", "", "", "", ""]',
        winner VARCHAR(100),
        created_by VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        finished_at TIMESTAMP
      );
    `);

    // Insert sample lobby messages if they don't exist
    await query(`
      INSERT INTO lobby_chat_messages (text, user_name) VALUES 
        ('Welcome to the Tic-Tac-Toe Game Lobby! 🎮', 'System'),
        ('Feel free to chat while waiting for games! 💬', 'System'),
        ('Click "Create Game" to start a new match! 🚀', 'System')
      ON CONFLICT DO NOTHING;
    `);

    console.log('Database initialized successfully');
    
    // Initialize demo users
    await AuthService.initializeDemoUsers();
    
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Chat persistence functions
export async function saveLobbyMessage(text: string, userName: string) {
  if (!pool) {
    console.warn('Database not configured. Message will not be persisted.');
    return null;
  }
  
  try {
    const result = await query(
      'INSERT INTO lobby_chat_messages (text, user_name) VALUES ($1, $2) RETURNING id, timestamp',
      [text, userName]
    );
    return result[0];
  } catch (error) {
    console.error('Error saving lobby message:', error);
    return null;
  }
}

export async function getLobbyMessages(limit: number = 100) {
  if (!pool) {
    console.warn('Database not configured. Returning empty messages.');
    return [];
  }
  
  try {
    const result = await query(
      'SELECT id, text, user_name, timestamp FROM lobby_chat_messages ORDER BY timestamp DESC LIMIT $1',
      [limit]
    );
    return result.reverse(); // Return in chronological order
  } catch (error) {
    console.error('Error getting lobby messages:', error);
    return [];
  }
}

export async function saveGameMessage(gameId: string, text: string, userName: string) {
  if (!pool) {
    console.warn('Database not configured. Message will not be persisted.');
    return null;
  }
  
  try {
    const result = await query(
      'INSERT INTO game_chat_messages (game_id, text, user_name) VALUES ($1, $2, $3) RETURNING id, timestamp',
      [gameId, text, userName]
    );
    return result[0];
  } catch (error) {
    console.error('Error saving game message:', error);
    return null;
  }
}

export async function getGameMessages(gameId: string, limit: number = 50) {
  if (!pool) {
    console.warn('Database not configured. Returning empty messages.');
    return [];
  }
  
  try {
    const result = await query(
      'SELECT id, text, user_name, timestamp FROM game_chat_messages WHERE game_id = $1 ORDER BY timestamp DESC LIMIT $2',
      [gameId, limit]
    );
    return result.reverse(); // Return in chronological order
  } catch (error) {
    console.error('Error getting game messages:', error);
    return [];
  }
}

export async function cleanupOldMessages() {
  if (!pool) {
    console.warn('Database not configured. Skipping cleanup.');
    return;
  }
  
  try {
    // Delete messages older than 24 hours
    await query(
      'DELETE FROM lobby_chat_messages WHERE created_at < NOW() - INTERVAL \'24 hours\''
    );
    await query(
      'DELETE FROM game_chat_messages WHERE created_at < NOW() - INTERVAL \'24 hours\''
    );
    console.log('Old messages cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up old messages:', error);
  }
}

// Game statistics functions
export async function updateGameStatistics(userName: string, gameResult: 'win' | 'loss' | 'draw') {
  if (!pool) {
    console.warn('Database not configured. Statistics will not be persisted.');
    return null;
  }
  
  try {
    // Use UPSERT to create or update statistics
    const result = await query(`
      INSERT INTO game_statistics (user_name, wins, losses, draws, total_games, updated_at)
      VALUES ($1, 
        CASE WHEN $2 = 'win' THEN 1 ELSE 0 END,
        CASE WHEN $2 = 'loss' THEN 1 ELSE 0 END,
        CASE WHEN $2 = 'draw' THEN 1 ELSE 0 END,
        1,
        NOW()
      )
      ON CONFLICT (user_name) 
      DO UPDATE SET
        wins = game_statistics.wins + CASE WHEN $2 = 'win' THEN 1 ELSE 0 END,
        losses = game_statistics.losses + CASE WHEN $2 = 'loss' THEN 1 ELSE 0 END,
        draws = game_statistics.draws + CASE WHEN $2 = 'draw' THEN 1 ELSE 0 END,
        total_games = game_statistics.total_games + 1,
        updated_at = NOW()
      RETURNING id, wins, losses, draws, total_games
    `, [userName, gameResult]);
    
    return result[0];
  } catch (error) {
    console.error('Error updating game statistics:', error);
    return null;
  }
}

export async function getUserStatistics(userName: string) {
  if (!pool) {
    console.warn('Database not configured. Returning default statistics.');
    return {
      wins: 0,
      losses: 0,
      draws: 0,
      total_games: 0
    };
  }
  
  try {
    const result = await query(
      'SELECT wins, losses, draws, total_games FROM game_statistics WHERE user_name = $1',
      [userName]
    );
    
    if (result.length > 0) {
      return result[0];
    } else {
      // Return default stats if user doesn't have any yet
      return {
        wins: 0,
        losses: 0,
        draws: 0,
        total_games: 0
      };
    }
  } catch (error) {
    console.error('Error getting user statistics:', error);
    return {
      wins: 0,
      losses: 0,
      draws: 0,
      total_games: 0
    };
  }
}

export async function getTopPlayers(limit: number = 10) {
  if (!pool) {
    console.warn('Database not configured. Returning empty leaderboard.');
    return [];
  }
  
  try {
    const result = await query(`
      SELECT user_name, wins, losses, draws, total_games,
             CASE WHEN total_games > 0 THEN ROUND((wins::float / total_games * 100), 1) ELSE 0 END as win_percentage
      FROM game_statistics 
      WHERE total_games > 0
      ORDER BY wins DESC, win_percentage DESC
      LIMIT $1
    `, [limit]);
    
    return result;
  } catch (error) {
    console.error('Error getting top players:', error);
    return [];
  }
}

export async function resetUserStatistics(userName: string) {
  if (!pool) {
    console.warn('Database not configured. Cannot reset statistics.');
    return false;
  }
  
  try {
    await query(
      'DELETE FROM game_statistics WHERE user_name = $1',
      [userName]
    );
    console.log(`Statistics reset for user: ${userName}`);
    return true;
  } catch (error) {
    console.error('Error resetting user statistics:', error);
    return false;
  }
} 