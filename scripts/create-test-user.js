const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function createTestUser() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not found. Please set it in your .env.local file');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('Creating test user...');
    const client = await pool.connect();
    
    // Hash the password
    const passwordHash = await bcrypt.hash('password123', 10);
    
    // Insert or update user
    await client.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO UPDATE SET password_hash = $2',
      ['Dave', passwordHash]
    );
    
    console.log('User Dave created/updated with password: password123');
    
    // Create statistics for the user
    await client.query(`
      INSERT INTO game_statistics (user_id, games_played, games_won, games_lost, games_drawn) 
      SELECT id, 0, 0, 0, 0 FROM users WHERE username = 'Dave' 
      AND NOT EXISTS (SELECT 1 FROM game_statistics WHERE user_id = (SELECT id FROM users WHERE username = 'Dave'))
    `);
    
    console.log('Statistics created for Dave');
    
    client.release();
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createTestUser(); 