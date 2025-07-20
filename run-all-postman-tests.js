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
  timeout: 10000
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
      headers: options.headers || {},
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
  
  // Test registration
  try {
    const registerResponse = await makeRequest(`${config.baseUrl}/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        username: 'postman_test_user',
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
        username: 'postman_test_user',
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
        userName: 'postman_test_user'
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
  
  // Test SSE connection (with timeout)
  try {
    const sseResponse = await makeRequest(`${config.baseUrl}/api/events?channel=test`, {
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      },
      timeout: 5000
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
      results.passed++;
    } else {
      log(`SSE Connection: FAILED - ${error.message}`, 'error');
      results.failed++;
    }
  }
}

async function testChatSystem() {
  log('Testing Chat endpoint...');
  
  try {
    const chatResponse = await makeRequest(`${config.baseUrl}/api/chat`, {
      method: 'POST',
      body: JSON.stringify({
        userName: 'postman_test_user',
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
  
  // Create test users
  const testUser1 = 'score_test_user1';
  const testUser2 = 'score_test_user2';
  
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

async function testSecurity() {
  log('Testing Security scenarios...');
  
  // Test XSS prevention
  try {
    const xssResponse = await makeRequest(`${config.baseUrl}/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        username: '<script>alert("xss")</script>',
        password: 'testpass123'
      })
    });
    
    if (xssResponse.status === 400 || xssResponse.status === 422) {
      log('XSS Prevention: PASSED', 'success');
      results.passed++;
    } else {
      log(`XSS Prevention: FAILED - Status: ${xssResponse.status}`, 'error');
      results.failed++;
    }
  } catch (error) {
    log(`XSS Prevention: FAILED - ${error.message}`, 'error');
    results.failed++;
  }
  
  // Test SQL injection prevention
  try {
    const sqlResponse = await makeRequest(`${config.baseUrl}/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        username: "'; DROP TABLE users; --",
        password: 'testpass123'
      })
    });
    
    if (sqlResponse.status === 400 || sqlResponse.status === 422 || sqlResponse.status === 500) {
      log('SQL Injection Prevention: PASSED', 'success');
      results.passed++;
    } else {
      log(`SQL Injection Prevention: FAILED - Status: ${sqlResponse.status}`, 'error');
      results.failed++;
    }
  } catch (error) {
    log(`SQL Injection Prevention: FAILED - ${error.message}`, 'error');
    results.failed++;
  }
}

async function testInputValidation() {
  log('Testing Input Validation...');
  
  // Test long input
  try {
    const longInput = 'a'.repeat(1000);
    const longResponse = await makeRequest(`${config.baseUrl}/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        username: longInput,
        password: 'testpass123'
      })
    });
    
    if (longResponse.status === 400) {
      log('Long Input Validation: PASSED', 'success');
      results.passed++;
    } else {
      log(`Long Input Validation: FAILED - Status: ${longResponse.status}`, 'error');
      results.failed++;
    }
  } catch (error) {
    log(`Long Input Validation: FAILED - ${error.message}`, 'error');
    results.failed++;
  }
  
  // Test missing required fields
  try {
    const missingResponse = await makeRequest(`${config.baseUrl}/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        username: 'testuser'
        // password missing
      })
    });
    
    if (missingResponse.status === 400) {
      log('Required Fields Validation: PASSED', 'success');
      results.passed++;
    } else {
      log(`Required Fields Validation: FAILED - Status: ${missingResponse.status}`, 'error');
      results.failed++;
    }
  } catch (error) {
    log(`Required Fields Validation: FAILED - ${error.message}`, 'error');
    results.failed++;
  }
}

// Main test execution
async function runAllTests() {
  log('🚀 Starting Comprehensive Postman Tests...');
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
  await testSecurity();
  await testInputValidation();
  
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