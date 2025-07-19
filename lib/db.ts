import { Pool, PoolClient } from 'pg';

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

// Initialize database with the required table
export async function initializeDatabase() {
  if (!pool) {
    console.warn('Database not configured. Skipping initialization.');
    return;
  }
  
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS chatRoomText (
        id SERIAL PRIMARY KEY,
        text VARCHAR(120) NOT NULL
      );
    `);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
} 