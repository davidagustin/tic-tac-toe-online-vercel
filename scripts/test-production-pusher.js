#!/usr/bin/env node

/**
 * Test Production Pusher Connection
 * 
 * This script tests the production Pusher app directly to verify connectivity.
 */

const Pusher = require('pusher');

async function testProductionPusher() {
  console.log('🧪 Testing Production Pusher Connection\n');

  // Production Pusher credentials (from our setup)
  const pusher = new Pusher({
    appId: '2024854',
    key: '2ea4f40363fb5b139bfc',
    secret: 'ddf40d594f1d9bd59ab2',
    cluster: 'us3',
    useTLS: true,
  });

  try {
    console.log('📡 Attempting to trigger a test event...');
    
    // Try to trigger a test event
    await pusher.trigger('test-channel', 'test-event', {
      message: 'Test message from production Pusher',
      timestamp: new Date().toISOString(),
    });

    console.log('✅ Successfully triggered test event!');
    console.log('✅ Production Pusher app is working correctly.');
    
  } catch (error) {
    console.error('❌ Failed to trigger test event:', error.message);
    console.error('❌ Error details:', error);
    
    if (error.message.includes('authentication')) {
      console.log('\n🔍 Possible issues:');
      console.log('1. Check if the Pusher app credentials are correct');
      console.log('2. Verify the app is active in Pusher dashboard');
      console.log('3. Check if there are any domain restrictions');
    }
  }
}

// Run the test
testProductionPusher().catch(console.error); 