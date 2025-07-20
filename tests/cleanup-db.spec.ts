import { test, expect } from '@playwright/test';

test.describe('Database Cleanup', () => {
  test('Clear database after tests', async ({ request }) => {
    console.log('🧹 Clearing database...');
    
    try {
      // Clear all data from the database
      const response = await request.post('/api/clear-db');
      
      if (response.ok()) {
        console.log('✅ Database cleared successfully');
      } else {
        console.log('⚠️ Database clear failed:', response.status());
      }
    } catch (error) {
      console.log('⚠️ Database clear error:', error);
    }
  });
}); 