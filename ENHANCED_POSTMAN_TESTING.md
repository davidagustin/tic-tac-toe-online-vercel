# Enhanced Postman Testing Guide

## 🚀 **Advanced Testing Scenarios**

This guide provides comprehensive testing scenarios beyond basic endpoint validation, including security testing, edge cases, performance testing, and advanced validation.

## 📋 **Additional Test Collections**

### **1. Enhanced Collection** (`postman-collection-enhanced.json`)
- **Comprehensive endpoint testing** with detailed validation
- **Advanced test scripts** with environment variable management
- **Error scenario testing** for all endpoints
- **Performance validation** with response time checks

### **2. Edge Cases Collection** (`postman-edge-cases.json`)
- **Security testing** (XSS, SQL injection, NoSQL injection)
- **Input validation** (long strings, special characters, Unicode)
- **Performance & stress testing** (concurrent requests, large payloads)
- **State management** (game state consistency, multiple moves)
- **Network & connectivity** (CORS, rate limiting)
- **Error handling** (malformed JSON, wrong content types)
- **Data validation** (game position, game ID format)

## 🔒 **Security Testing Scenarios**

### **XSS Prevention Tests**
```javascript
// Test XSS in username
pm.test("XSS in username handled", function () {
    pm.expect(pm.response.code).to.be.oneOf([400, 422]);
});
```

**Test Cases:**
- `<script>alert('xss')</script>` in username
- `javascript:alert('xss')` in game name
- HTML entities in chat messages

### **SQL Injection Tests**
```javascript
// Test SQL injection prevention
pm.test("SQL injection prevented", function () {
    pm.expect(pm.response.code).to.be.oneOf([400, 422, 500]);
});
```

**Test Cases:**
- `'; DROP TABLE users; --` in username
- `' OR 1=1 --` in login
- `' UNION SELECT * FROM users --` in search

### **NoSQL Injection Tests**
```javascript
// Test NoSQL injection prevention
pm.test("NoSQL injection prevented", function () {
    pm.expect(pm.response.code).to.be.oneOf([400, 422, 401]);
});
```

**Test Cases:**
- `{"$ne": ""}` in username field
- `{"$gt": ""}` in numeric fields
- `{"$regex": ".*"}` in search fields

## 📏 **Input Validation Tests**

### **Length Validation**
```javascript
// Test long input rejection
pm.test("Long input rejected", function () {
    pm.response.to.have.status(400);
});
```

**Test Cases:**
- 1000+ character usernames
- Large chat messages
- Oversized game names

### **Character Validation**
```javascript
// Test special characters
pm.test("Special characters handled", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 400, 422]);
});
```

**Test Cases:**
- Special characters: `user@#$%^&*()`
- Unicode characters: `用户测试`
- Emoji characters: `👤test`

### **Format Validation**
```javascript
// Test format validation
pm.test("Invalid format rejected", function () {
    pm.response.to.have.status(400);
});
```

**Test Cases:**
- Invalid game ID formats
- Invalid email formats (if applicable)
- Invalid position values

## ⚡ **Performance & Stress Testing**

### **Response Time Validation**
```javascript
// Test response time
pm.test("Response time under threshold", function () {
    pm.expect(pm.response.responseTime).to.be.below(1000);
});
```

**Thresholds:**
- Health check: < 500ms
- Game operations: < 2000ms
- Real-time events: < 1000ms

### **Memory Usage Monitoring**
```javascript
// Test memory usage
pm.test("Memory usage reasonable", function () {
    const response = pm.response.json();
    if (response.checks && response.checks.memory) {
        const memoryUsage = response.checks.memory.usage;
        pm.expect(memoryUsage.heapUsed).to.be.below(100000000); // 100MB
    }
});
```

### **Concurrent Request Testing**
```javascript
// Test concurrent requests
pm.test("Concurrent requests handled", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 429]);
});
```

## 🔄 **State Management Tests**

### **Game State Consistency**
```javascript
// Test game state
pm.test("Game state consistent", function () {
    const response = pm.response.json();
    pm.expect(response.game.status).to.eql('waiting');
    pm.expect(response.game.board).to.be.an('array');
    pm.expect(response.game.board).to.have.length(9);
});
```

### **Multiple Move Validation**
```javascript
// Test multiple moves
pm.test("Move updates game state correctly", function () {
    const response = pm.response.json();
    pm.expect(response.game.board[0]).to.not.be.empty;
    pm.expect(response.game.currentPlayer).to.not.eql('player1');
});
```

### **Game Completion Logic**
```javascript
// Test game completion
pm.test("Game completion detected", function () {
    const response = pm.response.json();
    if (response.game.winner) {
        pm.expect(response.game.status).to.eql('completed');
    }
});
```

## 🌐 **Network & Connectivity Tests**

### **CORS Headers Validation**
```javascript
// Test CORS headers
pm.test("CORS headers present", function () {
    pm.expect(pm.response.headers.get('Access-Control-Allow-Origin')).to.exist;
});
```

### **Rate Limiting Tests**
```javascript
// Test rate limiting
pm.test("Rate limiting headers present", function () {
    const headers = pm.response.headers;
    pm.expect(headers.has('X-RateLimit-Limit') || headers.has('Retry-After')).to.be.true;
});
```

### **Connection Stability**
```javascript
// Test connection stability
pm.test("Connection stable", function () {
    pm.expect(pm.response.code).to.not.eql(0);
    pm.expect(pm.response.responseTime).to.be.above(0);
});
```

## 🔍 **Error Handling Tests**

### **Malformed JSON**
```javascript
// Test malformed JSON
pm.test("Malformed JSON handled", function () {
    pm.response.to.have.status(400);
});
```

### **Wrong Content-Type**
```javascript
// Test wrong content type
pm.test("Wrong content type handled", function () {
    pm.response.to.have.status(400);
});
```

### **Missing Required Fields**
```javascript
// Test missing fields
pm.test("Missing fields handled", function () {
    pm.response.to.have.status(400);
    const response = pm.response.json();
    pm.expect(response.error).to.include('required');
});
```

## 📊 **Data Validation Tests**

### **Game Position Validation**
```javascript
// Test position validation
pm.test("Invalid position rejected", function () {
    pm.response.to.have.status(400);
});
```

**Test Cases:**
- Negative positions: -1, -5
- Out of range: 9, 10, 100
- Non-numeric: "abc", null, undefined

### **Game ID Format Validation**
```javascript
// Test game ID format
pm.test("Invalid game ID format handled", function () {
    pm.expect(pm.response.code).to.be.oneOf([400, 404, 422]);
});
```

**Test Cases:**
- Invalid formats: "invalid-id", "game_123", ""
- Non-existent IDs: "game-999999"
- Malformed IDs: "game@#$%"

## 🎯 **Advanced Test Scripts**

### **Environment Variable Management**
```javascript
// Store game ID for subsequent tests
if (pm.response.code === 200) {
    const response = pm.response.json();
    if (response.game && response.game.id) {
        pm.environment.set("gameId", response.game.id);
    }
}
```

### **Dynamic Test Data**
```javascript
// Generate dynamic test data
const timestamp = new Date().toISOString();
const randomId = Math.random().toString(36).substring(7);

pm.request.body.raw = pm.request.body.raw.replace('{{timestamp}}', timestamp);
pm.request.body.raw = pm.request.body.raw.replace('{{randomId}}', randomId);
```

### **Conditional Testing**
```javascript
// Conditional test execution
if (pm.environment.get("testMode") === "production") {
    pm.test("Production-specific test", function () {
        pm.expect(pm.response.code).to.eql(200);
    });
}
```

## 📈 **Load Testing with Postman**

### **Collection Runner Configuration**
1. **Iterations**: 100-1000 requests
2. **Delay**: 100-500ms between requests
3. **Log responses**: Enable for debugging
4. **Save responses**: For analysis

### **Performance Metrics**
```javascript
// Track performance metrics
pm.globals.set("totalRequests", parseInt(pm.globals.get("totalRequests") || "0") + 1);
pm.globals.set("totalResponseTime", parseInt(pm.globals.get("totalResponseTime") || "0") + pm.response.responseTime);

const avgResponseTime = pm.globals.get("totalResponseTime") / pm.globals.get("totalRequests");
console.log(`Average response time: ${avgResponseTime}ms`);
```

### **Error Rate Monitoring**
```javascript
// Monitor error rates
if (pm.response.code >= 400) {
    pm.globals.set("errorCount", parseInt(pm.globals.get("errorCount") || "0") + 1);
}

const errorRate = (pm.globals.get("errorCount") / pm.globals.get("totalRequests")) * 100;
console.log(`Error rate: ${errorRate}%`);
```

## 🔧 **Test Automation**

### **Pre-request Scripts**
```javascript
// Set up test data
pm.environment.set("testTimestamp", new Date().toISOString());
pm.environment.set("testUser", "testuser_" + Math.random().toString(36).substring(7));
```

### **Post-request Scripts**
```javascript
// Clean up test data
if (pm.response.code === 200) {
    // Store successful test data for cleanup
    pm.globals.set("cleanupData", pm.globals.get("cleanupData") + "," + pm.environment.get("testUser"));
}
```

### **Test Data Management**
```javascript
// Manage test data lifecycle
const cleanupData = pm.globals.get("cleanupData") || "";
if (cleanupData) {
    // Clean up test data after tests
    const users = cleanupData.split(",").filter(u => u);
    users.forEach(user => {
        // Call cleanup endpoint
        pm.sendRequest({
            url: pm.environment.get("baseUrl") + "/api/cleanup",
            method: "POST",
            header: { "Content-Type": "application/json" },
            body: { username: user }
        });
    });
}
```

## 📝 **Test Reporting**

### **Custom Test Reports**
```javascript
// Generate custom test reports
const testResults = {
    endpoint: pm.request.url.getPath(),
    method: pm.request.method,
    statusCode: pm.response.code,
    responseTime: pm.response.responseTime,
    timestamp: new Date().toISOString(),
    success: pm.response.code >= 200 && pm.response.code < 300
};

pm.globals.set("testResults", pm.globals.get("testResults") + JSON.stringify(testResults) + "\n");
```

### **Performance Dashboards**
```javascript
// Track performance metrics for dashboards
const metrics = {
    endpoint: pm.request.url.getPath(),
    avgResponseTime: pm.response.responseTime,
    successRate: pm.response.code < 400 ? 100 : 0,
    timestamp: new Date().toISOString()
};

// Send to monitoring service
pm.sendRequest({
    url: "https://your-monitoring-service.com/metrics",
    method: "POST",
    header: { "Content-Type": "application/json" },
    body: JSON.stringify(metrics)
});
```

## 🎉 **Conclusion**

These enhanced testing scenarios provide comprehensive coverage for:

- ✅ **Security vulnerabilities**
- ✅ **Input validation**
- ✅ **Performance characteristics**
- ✅ **State management**
- ✅ **Error handling**
- ✅ **Network connectivity**
- ✅ **Data integrity**

Use these test collections to ensure your API is robust, secure, and performant in all scenarios! 