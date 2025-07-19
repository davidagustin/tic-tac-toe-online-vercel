import { Pool, PoolClient } from 'pg';
import { AuthService } from './auth';

// Check if DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL not found. Database functionality will be disabled.');
  console.warn('For local development, you can use:');
  console.warn('- Vercel Postgres (recommended)');
  console.warn('- Supabase (free tier)');
  console.warn('- Neon (free tier)');
  console.warn('Set DATABASE_URL in your .env.local file');
}

// Create a connection pool for better performance
const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
}) : null;

export async function createConnection(): Promise<PoolClient | null> {
  if (!pool) {
    console.error('Database not configured. Please set DATABASE_URL environment variable.');
    return null;
  }
  return await pool.connect();
}

export async function query(sql: string, params?: any[]) {
  if (!pool) {
    console.error('Database not configured. Please set DATABASE_URL environment variable.');
    return [];
  }
  
  const client = await createConnection();
  if (!client) return [];
  
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Initialize database with the required tables
export async function initializeDatabase() {
  if (!pool) {
    console.warn('Database not configured. Skipping initialization.');
    return;
  }
  
  try {
    // Create lobby chat messages table
    await query(`
      CREATE TABLE IF NOT EXISTS lobby_chat_messages (
        id SERIAL PRIMARY KEY,
        text VARCHAR(500) NOT NULL,
        user_name VARCHAR(100) NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create game-specific chat messages table
    await query(`
      CREATE TABLE IF NOT EXISTS game_chat_messages (
        id SERIAL PRIMARY KEY,
        game_id VARCHAR(100) NOT NULL,
        text VARCHAR(500) NOT NULL,
        user_name VARCHAR(100) NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes for better performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_lobby_chat_timestamp ON lobby_chat_messages(timestamp DESC);
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_game_chat_game_id ON game_chat_messages(game_id);
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_game_chat_timestamp ON game_chat_messages(timestamp DESC);
    `);

    // Create legacy chat room text table (keeping for backward compatibility)
    await query(`
      CREATE TABLE IF NOT EXISTS chatRoomText (
        id SERIAL PRIMARY KEY,
        text VARCHAR(120) NOT NULL
      );
    `);

    // Create users table for authentication
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Insert sample lobby messages if they don't exist
    await query(`
      INSERT INTO lobby_chat_messages (text, user_name) VALUES 
        ('Welcome to the Tic-Tac-Toe Game Lobby! 🎮', 'System'),
        ('Feel free to chat while waiting for games! 💬', 'System')
      ON CONFLICT DO NOTHING;
    `);

    console.log('Database initialized successfully');
    
    // Initialize demo users
    await AuthService.initializeDemoUsers();
    
  } catch (error) {
    console.error('Error initializing database:', error);
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