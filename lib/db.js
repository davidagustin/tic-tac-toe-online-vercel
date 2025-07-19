// Simple JavaScript version of database functions for server.js
// This provides basic functionality without requiring TypeScript compilation

const { Pool } = require('pg');

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

async function createConnection() {
  if (!pool) {
    console.error('Database not configured. Please set DATABASE_URL environment variable.');
    return null;
  }
  return await pool.connect();
}

async function query(sql, params = []) {
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
async function initializeDatabase() {
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

    // Create game statistics table
    await query(`
      CREATE TABLE IF NOT EXISTS game_statistics (
        id SERIAL PRIMARY KEY,
        user_name VARCHAR(100) UNIQUE NOT NULL,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        draws INTEGER DEFAULT 0,
        total_games INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create index for game statistics
    await query(`
      CREATE INDEX IF NOT EXISTS idx_game_statistics_user_name ON game_statistics(user_name);
    `);

    // Insert sample lobby messages if they don't exist
    await query(`
      INSERT INTO lobby_chat_messages (text, user_name) VALUES 
        ('Welcome to the Tic-Tac-Toe Game Lobby! 🎮', 'System'),
        ('Feel free to chat while waiting for games! 💬', 'System')
      ON CONFLICT DO NOTHING;
    `);

    console.log('Database initialized successfully');
    
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Chat persistence functions
async function saveLobbyMessage(text, userName) {
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

async function getLobbyMessages(limit = 100) {
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

async function saveGameMessage(gameId, text, userName) {
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

async function getGameMessages(gameId, limit = 50) {
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

async function cleanupOldMessages() {
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
async function getUserStatistics(userName) {
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
    
    if (result.length === 0) {
      // Create default statistics for new user
      await query(
        'INSERT INTO game_statistics (user_name, wins, losses, draws, total_games) VALUES ($1, 0, 0, 0, 0)',
        [userName]
      );
      return {
        wins: 0,
        losses: 0,
        draws: 0,
        total_games: 0
      };
    }
    
    return result[0];
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

async function updateGameStatistics(userName, gameResult) {
  if (!pool) {
    console.warn('Database not configured. Statistics will not be updated.');
    return null;
  }
  
  try {
    // Get current statistics
    const currentStats = await getUserStatistics(userName);
    
    // Update based on game result
    let newWins = currentStats.wins;
    let newLosses = currentStats.losses;
    let newDraws = currentStats.draws;
    let newTotalGames = currentStats.total_games + 1;
    
    switch (gameResult) {
      case 'win':
        newWins += 1;
        break;
      case 'loss':
        newLosses += 1;
        break;
      case 'draw':
        newDraws += 1;
        break;
      default:
        console.error('Invalid game result:', gameResult);
        return null;
    }
    
    // Update or insert statistics
    await query(
      `INSERT INTO game_statistics (user_name, wins, losses, draws, total_games, updated_at) 
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_name) 
       DO UPDATE SET 
         wins = $2, 
         losses = $3, 
         draws = $4, 
         total_games = $5, 
         updated_at = NOW()`,
      [userName, newWins, newLosses, newDraws, newTotalGames]
    );
    
    return {
      wins: newWins,
      losses: newLosses,
      draws: newDraws,
      total_games: newTotalGames
    };
  } catch (error) {
    console.error('Error updating game statistics:', error);
    return null;
  }
}

module.exports = {
  query,
  initializeDatabase,
  saveLobbyMessage,
  getLobbyMessages,
  saveGameMessage,
  getGameMessages,
  cleanupOldMessages,
  getUserStatistics,
  updateGameStatistics
}; 