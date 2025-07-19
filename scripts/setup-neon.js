const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function setupNeonDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env.local');
    console.log('Please add your Neon database connection string to .env.local');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to Neon database...');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to Neon database successfully!');

    // Create tables
    console.log('📋 Creating database tables...');

    // Create lobby chat messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS lobby_chat_messages (
        id SERIAL PRIMARY KEY,
        text VARCHAR(500) NOT NULL,
        user_name VARCHAR(100) NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create game-specific chat messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_chat_messages (
        id SERIAL PRIMARY KEY,
        game_id VARCHAR(100) NOT NULL,
        text VARCHAR(500) NOT NULL,
        user_name VARCHAR(100) NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create game statistics table
    await client.query(`
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

    // Create users table for authentication
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_lobby_chat_timestamp ON lobby_chat_messages(timestamp DESC);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_game_chat_game_id ON game_chat_messages(game_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_game_chat_timestamp ON game_chat_messages(timestamp DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_game_stats_user_name ON game_statistics(user_name);
    `);

    // Insert sample lobby messages
    await client.query(`
      INSERT INTO lobby_chat_messages (text, user_name) VALUES 
        ('Welcome to the Tic-Tac-Toe Game Lobby! 🎮', 'System'),
        ('Feel free to chat while waiting for games! 💬', 'System')
      ON CONFLICT DO NOTHING;
    `);

    // Create demo users
    const bcrypt = require('bcryptjs');
    const demoUsers = [
      { username: 'demo1', password: 'password123' },
      { username: 'demo2', password: 'password123' }
    ];

    for (const user of demoUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await client.query(`
        INSERT INTO users (username, password) VALUES ($1, $2)
        ON CONFLICT (username) DO NOTHING;
      `, [user.username, hashedPassword]);
    }

    client.release();
    console.log('✅ Database setup completed successfully!');
    console.log('🎮 Your tic-tac-toe app is ready to use!');
    console.log('📝 Demo users created: demo1/password123, demo2/password123');

  } catch (error) {
    console.error('❌ Error setting up database:', error);
  } finally {
    await pool.end();
  }
}

setupNeonDatabase(); 