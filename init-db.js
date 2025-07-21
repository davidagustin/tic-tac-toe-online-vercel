const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function initializeDatabase() {
  try {
    console.log('🔧 Initializing database...');
    
    // Read the SQL setup file
    const setupSQL = fs.readFileSync(path.join(__dirname, 'db', 'setup.sql'), 'utf8');
    
    // Execute the setup SQL
    await pool.query(setupSQL);
    
    console.log('✅ Database initialized successfully!');
    
    // Test the connection
    const result = await pool.query('SELECT 1 as test');
    console.log('✅ Database connection test passed:', result.rows[0]);
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initializeDatabase(); 