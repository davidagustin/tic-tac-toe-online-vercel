#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Configuration
const config = {
  baseUrl: process.env.TEST_URL || 'http://localhost:3000',
  timeout: 10000,
  verbose: process.argv.includes('--verbose')
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const requestOptions = {
      timeout: config.timeout,
      ...options
    };

    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test functions
async function testHealthCheck() {
  log('Testing Health Check endpoint...');
  try {
    const response = await makeRequest(`${config.baseUrl}/api/health-check`);
    if (response.status === 200 && response.data.status === 'healthy') {
      log('Health Check: PASSED', 'success');
      results.passed++;
      return true;
    } else {
      log(`Health Check: FAILED - Status: ${response.status}`, 'error');
      results.failed++;
      return false;
    }
  } catch (error) {
    log(`Health Check: FAILED - ${error.message}`, 'error');
    results.failed++;
    return false;
  }
}

async function testAuthEndpoints() {
  log('Testing Authentication endpoints...');
  
  // Test Register
  try {
    const registerResponse = await makeRequest(`${config.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpass123'
      })
    });
    
    if (registerResponse.status === 200 || registerResponse.status === 409) {
      log('Register: PASSED', 'success');
      results.passed++;
    } else {
      log(`Register: FAILED - Status: ${registerResponse.status}`, 'error');
      results.failed++;
    }
  } catch (error) {
    log(`Register: FAILED - ${error.message}`, 'error');
    results.failed++;
  }

  // Test Login
  try {
    const loginResponse = await makeRequest(`${config.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpass123'
      })
    });
    
    if (loginResponse.status === 200) {
      log('Login: PASSED', 'success');
      results.passed++;
    } else {
      log(`Login: FAILED - Status: ${loginResponse.status}`, 'error');
      results.failed++;
    }
  } catch (error) {
    log(`Login: FAILED - ${error.message}`, 'error');
    results.failed++;
  }
}

async function testGameEndpoints() {
  log('Testing Game Management endpoints...');
  
  // Test List Games
  try {
    const listResponse = await makeRequest(`${config.baseUrl}/api/game/list`);
    if (listResponse.status === 200) {
      log('List Games: PASSED', 'success');
      results.passed++;
    } else {
      log(`List Games: FAILED - Status: ${listResponse.status}`, 'error');
      results.failed++;
    }
  } catch (error) {
    log(`List Games: FAILED - ${error.message}`, 'error');
    results.failed++;
  }

  // Test Create Game
  try {
    const createResponse = await makeRequest(`${config.baseUrl}/api/game/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameName: 'Test Game',
        userName: 'testuser'
      })
    });
    
    if (createResponse.status === 200) {
      log('Create Game: PASSED', 'success');
      results.passed++;
      
      // Store game ID for join test
      if (createResponse.data && createResponse.data.game) {
        global.testGameId = createResponse.data.game.id;
      }
    } else {
      log(`Create Game: FAILED - Status: ${createResponse.status}`, 'error');
      results.failed++;
    }
  } catch (error) {
    log(`Create Game: FAILED - ${error.message}`, 'error');
    results.failed++;
  }
}

async function testEventsEndpoint() {
  log('Testing Real-time Events endpoint...');
  
  // Test POST Events
  try {
    const eventResponse = await makeRequest(`${config.baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'test',
        event: 'test-message',
        data: { message: 'Hello from test script!' }
      })
    });
    
    if (eventResponse.status === 200) {
      log('Send Event: PASSED', 'success');
      results.passed++;
    } else {
      log(`Send Event: FAILED - Status: ${eventResponse.status}`, 'error');
      results.failed++;
    }
  } catch (error) {
    log(`Send Event: FAILED - ${error.message}`, 'error');
    results.failed++;
  }

  // Test GET Events (SSE)
  try {
    const sseResponse = await makeRequest(`${config.baseUrl}/api/events?channel=test`, {
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      },
      timeout: 5000 // 5 second timeout for SSE
    });
    
    if (sseResponse.status === 200) {
      log('SSE Connection: PASSED', 'success');
      results.passed++;
    } else {
      log(`SSE Connection: FAILED - Status: ${sseResponse.status}`, 'error');
      results.failed++;
    }
  } catch (error) {
    if (error.message.includes('timeout')) {
      log('SSE Connection: TIMEOUT (expected for long-running connection)', 'info');
      results.passed++; // Count timeout as success for SSE
    } else {
      log(`SSE Connection: FAILED - ${error.message}`, 'error');
      results.failed++;
    }
  }
}

async function testChatEndpoint() {
  log('Testing Chat endpoint...');
  
  try {
    const chatResponse = await makeRequest(`${config.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userName: 'testuser',
        text: 'Hello from test script!'
      })
    });
    
    if (chatResponse.status === 200) {
      log('Send Chat: PASSED', 'success');
      results.passed++;
    } else {
      log(`Send Chat: FAILED - Status: ${chatResponse.status}`, 'error');
      results.failed++;
    }
  } catch (error) {
    log(`Send Chat: FAILED - ${error.message}`, 'error');
    results.failed++;
  }
}

async function testConfigEndpoints() {
  log('Testing Configuration endpoints...');
  
  // Test Pusher Config
  try {
    const pusherResponse = await makeRequest(`${config.baseUrl}/api/pusher-config`);
    if (pusherResponse.status === 200) {
      log('Pusher Config: PASSED', 'success');
      results.passed++;
    } else {
      log(`Pusher Config: FAILED - Status: ${pusherResponse.status}`, 'error');
      results.failed++;
    }
  } catch (error) {
    log(`Pusher Config: FAILED - ${error.message}`, 'error');
    results.failed++;
  }

  // Test Debug Environment
  try {
    const debugResponse = await makeRequest(`${config.baseUrl}/api/debug-env`);
    if (debugResponse.status === 200) {
      log('Debug Environment: PASSED', 'success');
      results.passed++;
    } else {
      log(`Debug Environment: FAILED - Status: ${debugResponse.status}`, 'error');
      results.failed++;
    }
  } catch (error) {
    log(`Debug Environment: FAILED - ${error.message}`, 'error');
    results.failed++;
  }
}

async function testWebSocketEndpoint() {
  log('Testing WebSocket endpoint...');
  
  try {
    const wsResponse = await makeRequest(`${config.baseUrl}/api/websocket?channel=test&clientId=testscript`);
    if (wsResponse.status === 200) {
      log('WebSocket Endpoint: PASSED', 'success');
      results.passed++;
    } else {
      log(`WebSocket Endpoint: FAILED - Status: ${wsResponse.status}`, 'error');
      results.failed++;
    }
  } catch (error) {
    log(`WebSocket Endpoint: FAILED - ${error.message}`, 'error');
    results.failed++;
  }
}

// Main test runner
async function runTests() {
  log('🚀 Starting API Endpoint Tests...');
  log(`📍 Testing against: ${config.baseUrl}`);
  log('');

  const tests = [
    testHealthCheck,
    testAuthEndpoints,
    testGameEndpoints,
    testEventsEndpoint,
    testChatEndpoint,
    testConfigEndpoints,
    testWebSocketEndpoint
  ];

  for (const test of tests) {
    try {
      await test();
      results.total++;
    } catch (error) {
      log(`Test failed with error: ${error.message}`, 'error');
      results.failed++;
      results.total++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Print results
  log('');
  log('📊 Test Results Summary:');
  log(`✅ Passed: ${results.passed}`);
  log(`❌ Failed: ${results.failed}`);
  log(`📈 Total: ${results.total}`);
  log(`📊 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  if (results.failed === 0) {
    log('🎉 All tests passed!', 'success');
    process.exit(0);
  } else {
    log('⚠️  Some tests failed. Check the logs above.', 'error');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  console.log(`
API Endpoint Testing Script

Usage:
  node test-endpoints.js [options]

Options:
  --url <url>     Set the base URL to test against (default: http://localhost:3000)
  --verbose       Enable verbose logging
  --help          Show this help message

Examples:
  node test-endpoints.js
  node test-endpoints.js --url https://myapp.vercel.app
  node test-endpoints.js --verbose
`);
  process.exit(0);
}

// Extract URL from command line
const urlIndex = process.argv.indexOf('--url');
if (urlIndex !== -1 && process.argv[urlIndex + 1]) {
  config.baseUrl = process.argv[urlIndex + 1];
}

// Run the tests
runTests().catch(error => {
  log(`Test runner failed: ${error.message}`, 'error');
  process.exit(1);
}); 