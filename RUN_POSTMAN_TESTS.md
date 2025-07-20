# Running All Postman Tests

## 🚀 **Complete Test Execution Guide**

This guide provides step-by-step instructions for running all Postman test collections manually, including the enhanced score tracking tests.

## 📋 **Available Test Collections**

### **1. Basic API Testing** (`postman-collection.json`)
- **15 API endpoints** with basic validation
- **Simple test scripts** for each endpoint
- **Environment variables** for easy configuration

### **2. Enhanced Testing** (`postman-collection-enhanced.json`)
- **Advanced validation** with detailed test scripts
- **Score tracking integration** with statistics verification
- **Performance monitoring** and error handling
- **Environment variable management**

### **3. Edge Cases & Security** (`postman-edge-cases.json`)
- **Security testing** (XSS, SQL injection, NoSQL injection)
- **Input validation** (long strings, special characters, Unicode)
- **Performance & stress testing** (concurrent requests, large payloads)
- **Error handling** scenarios

### **4. Score Tracking** (`postman-score-tracking.json`)
- **Complete game flow testing** with score verification
- **Win/Loss/Draw scenarios** with detailed validation
- **Statistics structure validation** with data integrity checks
- **Multi-player score tracking** for both players

## 🎯 **Step-by-Step Test Execution**

### **Step 1: Import Collections into Postman**

1. **Open Postman**
2. **Click "Import"** in the top left
3. **Import each collection file:**
   - `postman-collection.json`
   - `postman-collection-enhanced.json`
   - `postman-edge-cases.json`
   - `postman-score-tracking.json`

### **Step 2: Configure Environment Variables**

1. **Create a new environment** in Postman
2. **Add the following variables:**

```json
{
  "baseUrl": "http://localhost:3000",
  "username": "testuser",
  "password": "testpass123",
  "gameId": "",
  "authToken": "",
  "testUsername1": "player1",
  "testUsername2": "player2",
  "maliciousInput": "<script>alert('xss')</script>",
  "longString": "a".repeat(1000)
}
```

### **Step 3: Run Basic Collection First**

1. **Select the basic collection** (`postman-collection.json`)
2. **Click "Run"** to open the Collection Runner
3. **Configure settings:**
   - **Environment**: Select your configured environment
   - **Iterations**: 1 (for initial testing)
   - **Delay**: 1000ms (1 second between requests)
4. **Click "Run"** to execute all tests

### **Step 4: Run Enhanced Collection**

1. **Select the enhanced collection** (`postman-collection-enhanced.json`)
2. **Click "Run"** to open the Collection Runner
3. **Configure settings:**
   - **Environment**: Select your configured environment
   - **Iterations**: 1
   - **Delay**: 2000ms (2 seconds between requests)
4. **Click "Run"** to execute enhanced tests

### **Step 5: Run Score Tracking Collection**

1. **Select the score tracking collection** (`postman-score-tracking.json`)
2. **Click "Run"** to open the Collection Runner
3. **Configure settings:**
   - **Environment**: Select your configured environment
   - **Iterations**: 1
   - **Delay**: 3000ms (3 seconds between requests)
4. **Click "Run"** to execute score tracking tests

### **Step 6: Run Edge Cases Collection**

1. **Select the edge cases collection** (`postman-edge-cases.json`)
2. **Click "Run"** to open the Collection Runner
3. **Configure settings:**
   - **Environment**: Select your configured environment
   - **Iterations**: 1
   - **Delay**: 1000ms (1 second between requests)
4. **Click "Run"** to execute edge case tests

## 🔧 **Manual Test Execution**

### **Individual Endpoint Testing**

#### **1. Health Check**
```bash
# Test health check endpoint
GET {{baseUrl}}/api/health-check

# Expected Response:
{
  "status": "healthy",
  "timestamp": "2025-07-20T04:00:00.000Z",
  "checks": {
    "database": { "status": "healthy" },
    "pusher": { "status": "healthy" },
    "memory": { "status": "healthy" }
  }
}
```

#### **2. Authentication Flow**
```bash
# Register user
POST {{baseUrl}}/api/auth/register
{
  "username": "{{username}}",
  "password": "{{password}}"
}

# Login user
POST {{baseUrl}}/api/auth/login
{
  "username": "{{username}}",
  "password": "{{password}}"
}
```

#### **3. Game Management Flow**
```bash
# Create game
POST {{baseUrl}}/api/game/create
{
  "gameName": "Test Game",
  "userName": "{{testUsername1}}"
}

# Join game
POST {{baseUrl}}/api/game/join
{
  "gameId": "{{gameId}}",
  "userName": "{{testUsername2}}"
}

# Make move
POST {{baseUrl}}/api/game/move
{
  "gameId": "{{gameId}}",
  "userName": "{{testUsername1}}",
  "position": 0
}
```

#### **4. Score Tracking Verification**
```bash
# Get initial stats
GET {{baseUrl}}/api/stats/{{testUsername1}}

# Play complete game (see score tracking collection)
# Verify stats updated
GET {{baseUrl}}/api/stats/{{testUsername1}}
```

## 📊 **Expected Test Results**

### **Basic Collection Results**
- **✅ Health Check**: 200 OK with health status
- **✅ Authentication**: 200 OK for register/login
- **✅ Game Management**: 200 OK for create/join/move
- **✅ Real-time Events**: 200 OK for SSE and events
- **✅ Chat System**: 200 OK for send/get messages
- **✅ Statistics**: 200 OK with player stats
- **✅ Configuration**: 200 OK for config endpoints

### **Enhanced Collection Results**
- **✅ Score Tracking**: Stats updated after games
- **✅ Performance**: Response times under thresholds
- **✅ Error Handling**: Proper error responses
- **✅ Data Validation**: Correct data types and structure

### **Score Tracking Collection Results**
- **✅ Win Game**: Winner gets +1 win, loser gets +1 loss
- **✅ Draw Game**: Both players get +1 draw
- **✅ Statistics Structure**: All required fields present
- **✅ Win Rate Calculation**: Correct percentage calculation

### **Edge Cases Collection Results**
- **✅ Security Tests**: XSS/SQL injection prevented
- **✅ Input Validation**: Long/special characters handled
- **✅ Performance Tests**: Response times acceptable
- **✅ Error Handling**: Graceful error responses

## 🚨 **Troubleshooting**

### **Connection Issues**
```bash
# Check if server is running
curl http://localhost:3000/api/health-check

# If server not running, start it:
npm run dev
```

### **Authentication Issues**
```bash
# Clear authentication
POST {{baseUrl}}/api/clear-auth

# Re-register and login
POST {{baseUrl}}/api/auth/register
POST {{baseUrl}}/api/auth/login
```

### **Database Issues**
```bash
# Initialize database
node scripts/init-db.js

# Check database connection
node scripts/test-db.js
```

### **Environment Variable Issues**
```bash
# Verify environment variables are set
echo $DATABASE_URL
echo $PUSHER_APP_ID
echo $PUSHER_KEY
echo $PUSHER_SECRET
```

## 📈 **Performance Testing**

### **Load Testing with Collection Runner**
1. **Set iterations to 100-1000**
2. **Set delay to 100-500ms**
3. **Monitor response times**
4. **Check for errors**

### **Concurrent Testing**
1. **Open multiple Postman instances**
2. **Run same collection simultaneously**
3. **Monitor for race conditions**
4. **Verify data consistency**

## 🔍 **Test Monitoring**

### **Response Time Monitoring**
```javascript
// In test scripts
pm.test("Response time acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});
```

### **Error Rate Monitoring**
```javascript
// Track error rates
if (pm.response.code >= 400) {
    console.log(`Error: ${pm.response.code} - ${pm.response.status}`);
}
```

### **Data Consistency Monitoring**
```javascript
// Verify data integrity
pm.test("Data consistency", function () {
    const response = pm.response.json();
    pm.expect(response.stats.totalGames).to.eql(
        response.stats.wins + response.stats.losses + response.stats.draws
    );
});
```

## 📝 **Test Reporting**

### **Collection Runner Reports**
- **Pass/Fail counts** for each test
- **Response times** for performance analysis
- **Error details** for debugging
- **Test execution logs** for troubleshooting

### **Custom Test Reports**
```javascript
// Generate custom reports
const testResults = {
    endpoint: pm.request.url.getPath(),
    method: pm.request.method,
    statusCode: pm.response.code,
    responseTime: pm.response.responseTime,
    timestamp: new Date().toISOString(),
    success: pm.response.code >= 200 && pm.response.code < 300
};

console.log(JSON.stringify(testResults));
```

## 🎉 **Success Criteria**

### **All Tests Passing**
- **Basic Collection**: 100% pass rate
- **Enhanced Collection**: 100% pass rate
- **Score Tracking Collection**: 100% pass rate
- **Edge Cases Collection**: 100% pass rate

### **Performance Targets**
- **Response Time**: < 2 seconds for all endpoints
- **Error Rate**: < 1% under normal load
- **Data Consistency**: 100% accurate score tracking
- **Security**: All vulnerability tests pass

### **Score Tracking Accuracy**
- **Win Games**: Winner +1 win, loser +1 loss
- **Draw Games**: Both players +1 draw
- **Total Games**: Accurate count for all players
- **Win Rate**: Correct percentage calculation

## 🚀 **Next Steps**

1. **Run all collections** following the step-by-step guide
2. **Monitor test results** and performance metrics
3. **Debug any failures** using the troubleshooting guide
4. **Verify score tracking** accuracy across all scenarios
5. **Document any issues** for future improvements

The comprehensive test suite is now ready for execution! 🎯 