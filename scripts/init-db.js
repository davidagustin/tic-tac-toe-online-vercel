const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function initializeDatabase() {
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
    
    console.log('Reading database setup file...');
    const setupSQL = fs.readFileSync(path.join(__dirname, '../db/setup.sql'), 'utf8');
    
    console.log('Executing database setup...');
    await client.query(setupSQL);
    
    console.log('Database initialized successfully!');
    
    // Test the connection by checking if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('lobby_chat_messages', 'game_chat_messages', 'game_statistics', 'users')
      ORDER BY table_name
    `);
    
    console.log('Created tables:', tablesResult.rows.map(row => row.table_name));
    
    client.release();
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initializeDatabase(); 