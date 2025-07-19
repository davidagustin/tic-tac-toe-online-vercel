const { Pool } = require('pg');
const { updateGameStatistics, getUserStatistics } = require('../lib/db.js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testDatabase() {
  console.log('Testing database connection and statistics...');
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not found!');
    return;
  }

  try {
    // Test getting statistics for a user
    console.log('\n1. Testing getUserStatistics...');
    const stats = await getUserStatistics('testuser');
    console.log('Initial stats for testuser:', stats);

    // Test updating statistics
    console.log('\n2. Testing updateGameStatistics...');
    const result = await updateGameStatistics('testuser', 'win');
    console.log('Update result:', result);

    // Test getting updated statistics
    console.log('\n3. Testing getUserStatistics after update...');
    const updatedStats = await getUserStatistics('testuser');
    console.log('Updated stats for testuser:', updatedStats);

    // Test another update
    console.log('\n4. Testing another update...');
    await updateGameStatistics('testuser', 'loss');
    const finalStats = await getUserStatistics('testuser');
    console.log('Final stats for testuser:', finalStats);

    console.log('\n✅ Database test completed successfully!');
  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

testDatabase(); 