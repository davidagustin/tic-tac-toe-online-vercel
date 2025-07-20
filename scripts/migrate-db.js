const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function migrateDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not found. Please set it in your .env.local file');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    console.log('Starting database migration...');
    
    // Check if password_hash column exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password_hash'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('Renaming password column to password_hash...');
      await client.query('ALTER TABLE users RENAME COLUMN password TO password_hash');
    }
    
    // Check if last_login column exists
    const lastLoginCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'last_login'
    `);
    
    if (lastLoginCheck.rows.length === 0) {
      console.log('Adding last_login column...');
      await client.query('ALTER TABLE users ADD COLUMN last_login TIMESTAMP');
    }
    
    // Check if games table exists
    const gamesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'games'
    `);
    
    if (gamesCheck.rows.length === 0) {
      console.log('Creating games table...');
      await client.query(`
        CREATE TABLE games (
          id SERIAL PRIMARY KEY,
          game_id VARCHAR(50) UNIQUE NOT NULL,
          player1_id INTEGER REFERENCES users(id),
          player2_id INTEGER REFERENCES users(id),
          current_player_id INTEGER REFERENCES users(id),
          board_state JSONB DEFAULT '["", "", "", "", "", "", "", "", ""]',
          game_status VARCHAR(20) DEFAULT 'waiting',
          winner_id INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create indexes for games table
      await client.query('CREATE INDEX idx_games_game_id ON games(game_id)');
      await client.query('CREATE INDEX idx_games_status ON games(game_status)');
    }
    
    // Check game_statistics table structure and migrate if needed
    const statsColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'game_statistics' 
      ORDER BY ordinal_position
    `);
    
    const hasUserId = statsColumns.rows.some(col => col.column_name === 'user_id');
    const hasUserName = statsColumns.rows.some(col => col.column_name === 'user_name');
    
    if (!hasUserId && hasUserName) {
      console.log('Migrating game_statistics table structure...');
      // Create new table with proper structure
      await client.query(`
        CREATE TABLE game_statistics_new (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          games_played INTEGER DEFAULT 0,
          games_won INTEGER DEFAULT 0,
          games_lost INTEGER DEFAULT 0,
          games_drawn INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Migrate data from old table to new table
      await client.query(`
        INSERT INTO game_statistics_new (user_id, games_played, games_won, games_lost, games_drawn, created_at, updated_at)
        SELECT u.id, 
               COALESCE(gs.total_games, 0) as games_played,
               COALESCE(gs.wins, 0) as games_won,
               COALESCE(gs.losses, 0) as games_lost,
               COALESCE(gs.draws, 0) as games_drawn,
               COALESCE(gs.created_at, CURRENT_TIMESTAMP) as created_at,
               COALESCE(gs.updated_at, CURRENT_TIMESTAMP) as updated_at
        FROM users u
        LEFT JOIN game_statistics gs ON u.username = gs.user_name
      `);
      
      // Drop old table and rename new table
      await client.query('DROP TABLE game_statistics');
      await client.query('ALTER TABLE game_statistics_new RENAME TO game_statistics');
      
      console.log('Game statistics table migrated successfully');
    }
    
    // Create other indexes if they don't exist
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_lobby_messages_timestamp ON lobby_chat_messages(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_game_messages_game_timestamp ON game_chat_messages(game_id, timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)'
    ];
    
    for (const indexQuery of indexes) {
      await client.query(indexQuery);
    }
    
    console.log('Database migration completed successfully!');
    
    // Verify the structure
    const usersColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('Users table structure:', usersColumns.rows);
    
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('All tables:', tables.rows.map(r => r.table_name));
    
    client.release();
  } catch (error) {
    console.error('Error migrating database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateDatabase(); 