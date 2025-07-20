#!/usr/bin/env node

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
const config = {
  baseUrl: process.argv.includes('--url') 
    ? process.argv[process.argv.indexOf('--url') + 1] 
    : 'http://localhost:3000',
  verbose: process.argv.includes('--verbose'),
  timeout: 15000
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  total: 0
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const emoji = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  };
  console.log(`${emoji[type]} [${timestamp}] ${message}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Postman-Test-Script/1.0',
        ...options.headers
      },
      timeout: options.timeout || config.timeout
    };

    if (options.body) {
      requestOptions.headers['Content-Type'] = 'application/json';
      requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
    }

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            rawData: data
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: null,
            rawData: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
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
    
    if (response.status === 200) {
      log('Health Check: PASSED', 'success');
      results.passed++;
      
      if (config.verbose) {
        log(`Response: ${JSON.stringify(response.data, null, 2)}`);
      }
    } else {
      log(`Health Check: FAILED - Status: ${response.status}`, 'error');
      results.failed++;
    }
  } catch (error) {
    log(`Health Check: FAILED - ${error.message}`, 'error');
    results.failed++;
  }
}

async function testAuthentication() {
  log('Testing Authentication endpoints...');
  
  const testUsername = `testuser_${Date.now()}`;
  
  // Test registration
  try {
    const registerResponse = await makeRequest(`${config.baseUrl}/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        username: testUsername,
        password: 'testpass123'
      })
    });
    
    if (registerResponse.status === 200) {
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
  
  // Test login
  try {
    const loginResponse = await makeRequest(`${config.baseUrl}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        username: testUsername,
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

async function testGameManagement() {
  log('Testing Game Management endpoints...');
  
  // Test list games
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
  
  // Test create game
  try {
    const createResponse = await makeRequest(`${config.baseUrl}/api/game/create`, {
      method: 'POST',
      body: JSON.stringify({
        gameName: 'Postman Test Game',
        userName: 'testuser'
      })
    });
    
    if (createResponse.status === 200) {
      log('Create Game: PASSED', 'success');
      results.passed++;
      
      // Store game ID for subsequent tests
      if (createResponse.data && createResponse.data.game && createResponse.data.game.id) {
        global.testGameId = createResponse.data.game.id;
        log(`Game created with ID: ${global.testGameId}`);
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

async function testRealTimeEvents() {
  log('Testing Real-time Events endpoint...');
  
  // Test send event
  try {
    const eventResponse = await makeRequest(`${config.baseUrl}/api/events`, {
      method: 'POST',
      body: JSON.stringify({
        channel: 'test-channel',
        event: 'test-event',
        data: { message: 'Hello from Postman test!' }
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
}

async function testChatSystem() {
  log('Testing Chat endpoint...');
  
  try {
    const chatResponse = await makeRequest(`${config.baseUrl}/api/chat`, {
      method: 'POST',
      body: JSON.stringify({
        userName: 'testuser',
        text: 'Hello from Postman test!'
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

async function testConfiguration() {
  log('Testing Configuration endpoints...');
  
  // Test Pusher config
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
  
  // Test debug environment
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

async function testWebSocket() {
  log('Testing WebSocket endpoint...');
  
  try {
    const wsResponse = await makeRequest(`${config.baseUrl}/api/websocket?channel=test&clientId=postman`);
    
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

async function testScoreTracking() {
  log('Testing Score Tracking functionality...');
  
  const testUser1 = `score_user1_${Date.now()}`;
  const testUser2 = `score_user2_${Date.now()}`;
  
  // Register users
  try {
    await makeRequest(`${config.baseUrl}/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        username: testUser1,
        password: 'testpass123'
      })
    });
    
    await makeRequest(`${config.baseUrl}/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        username: testUser2,
        password: 'testpass123'
      })
    });
    
    log('Test users registered', 'success');
  } catch (error) {
    log(`User registration failed: ${error.message}`, 'error');
    return;
  }
  
  // Create game
  try {
    const createResponse = await makeRequest(`${config.baseUrl}/api/game/create`, {
      method: 'POST',
      body: JSON.stringify({
        gameName: 'Score Test Game',
        userName: testUser1
      })
    });
    
    if (createResponse.status === 200 && createResponse.data.game) {
      const gameId = createResponse.data.game.id;
      log(`Game created: ${gameId}`, 'success');
      
      // Join game
      const joinResponse = await makeRequest(`${config.baseUrl}/api/game/join`, {
        method: 'POST',
        body: JSON.stringify({
          gameId: gameId,
          userName: testUser2
        })
      });
      
      if (joinResponse.status === 200) {
        log('Game joined successfully', 'success');
        results.passed++;
      } else {
        log(`Game join failed: ${joinResponse.status}`, 'error');
        results.failed++;
      }
    } else {
      log('Game creation failed', 'error');
      results.failed++;
    }
  } catch (error) {
    log(`Game management failed: ${error.message}`, 'error');
    results.failed++;
  }
}

// Main test execution
async function runAllTests() {
  log('🚀 Starting Simple Postman Tests...');
  log(`📍 Testing against: ${config.baseUrl}`);
  log('');
  
  // Run all test suites
  await testHealthCheck();
  await testAuthentication();
  await testGameManagement();
  await testRealTimeEvents();
  await testChatSystem();
  await testConfiguration();
  await testWebSocket();
  await testScoreTracking();
  
  // Print results
  log('');
  log('📊 Test Results Summary:');
  log(`✅ Passed: ${results.passed}`);
  log(`❌ Failed: ${results.failed}`);
  log(`📈 Total: ${results.passed + results.failed}`);
  
  const successRate = results.passed + results.failed > 0 
    ? ((results.passed / (results.passed + results.failed)) * 100).toFixed(1)
    : 0;
  log(`📊 Success Rate: ${successRate}%`);
  
  if (results.failed === 0) {
    log('🎉 All tests passed!', 'success');
  } else {
    log('⚠️  Some tests failed. Check the logs above.', 'warning');
  }
}

// Run tests
runAllTests().catch(error => {
  log(`Test execution failed: ${error.message}`, 'error');
  process.exit(1);
}); 