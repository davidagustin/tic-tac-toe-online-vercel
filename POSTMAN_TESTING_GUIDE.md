# Postman Testing Guide for Tic-Tac-Toe Online API

## Overview
This guide provides comprehensive testing instructions for all API endpoints using Postman. The API is designed for real-time multiplayer Tic-Tac-Toe with authentication, game management, and real-time communication.

## Setup Instructions

### 1. Import Postman Collection
1. Download the `postman-collection.json` file from this project
2. Open Postman
3. Click "Import" and select the JSON file
4. The collection will be imported with all endpoints pre-configured

### 2. Environment Variables
Set up the following environment variables in Postman:

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `baseUrl` | Base URL for the API | `http://localhost:3000` |
| `username` | Test username | `testuser` |
| `password` | Test password | `testpass123` |
| `gameId` | Game ID (auto-populated) | `` |
| `authToken` | Authentication token (auto-populated) | `` |

## Endpoint Testing Guide

### 🔍 Health Check
**Endpoint:** `GET {{baseUrl}}/api/health-check`

**Purpose:** Verify API is running and healthy

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-07-20T03:24:00.851Z",
  "uptime": 170.857408334,
  "environment": "development",
  "version": "0.1.0",
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 1100
    },
    "pusher": {
      "status": "healthy"
    },
    "memory": {
      "status": "healthy",
      "usage": {
        "rss": 1151,
        "heapTotal": 308,
        "heapUsed": 162,
        "external": 1209
      }
    }
  }
}
```

### 🔐 Authentication Endpoints

#### Register User
**Endpoint:** `POST {{baseUrl}}/api/auth/register`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "username": "{{username}}",
  "password": "{{password}}"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "testuser"
  }
}
```

#### Login User
**Endpoint:** `POST {{baseUrl}}/api/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "username": "{{username}}",
  "password": "{{password}}"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "testuser"
  }
}
```

#### Clear Auth
**Endpoint:** `POST {{baseUrl}}/api/clear-auth`

**Purpose:** Clear authentication and clean up user data

**Expected Response:**
```json
{
  "success": true,
  "message": "Authentication cleared"
}
```

### 🎮 Game Management Endpoints

#### List Games
**Endpoint:** `GET {{baseUrl}}/api/game/list`

**Purpose:** Get all available games

**Expected Response:**
```json
{
  "games": [
    {
      "id": "game-123",
      "name": "Test Game",
      "status": "waiting",
      "player1": "testuser",
      "player2": null,
      "created_at": "2025-07-20T03:24:00.851Z"
    }
  ]
}
```

#### Create Game
**Endpoint:** `POST {{baseUrl}}/api/game/create`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "gameName": "Test Game",
  "userName": "{{username}}"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Game created successfully",
  "game": {
    "id": "game-123",
    "name": "Test Game",
    "status": "waiting",
    "player1": "testuser",
    "player2": null,
    "board": ["", "", "", "", "", "", "", "", ""],
    "currentPlayer": "testuser"
  }
}
```

**Postman Test Script:**
```javascript
// Extract game ID for future requests
if (pm.response.code === 200) {
    const response = pm.response.json();
    if (response.game && response.game.id) {
        pm.environment.set("gameId", response.game.id);
    }
}
```

#### Join Game
**Endpoint:** `POST {{baseUrl}}/api/game/join`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "gameId": "{{gameId}}",
  "userName": "{{username}}"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Joined game successfully",
  "game": {
    "id": "game-123",
    "name": "Test Game",
    "status": "playing",
    "player1": "player1",
    "player2": "testuser",
    "board": ["", "", "", "", "", "", "", "", ""],
    "currentPlayer": "player1"
  }
}
```

#### Make Move
**Endpoint:** `POST {{baseUrl}}/api/game/move`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "gameId": "{{gameId}}",
  "userName": "{{username}}",
  "position": 0
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Move made successfully",
  "game": {
    "id": "game-123",
    "name": "Test Game",
    "status": "playing",
    "player1": "player1",
    "player2": "testuser",
    "board": ["X", "", "", "", "", "", "", "", ""],
    "currentPlayer": "player1",
    "winner": null
  }
}
```

### 📡 Real-time Events Endpoints

#### SSE Connection
**Endpoint:** `GET {{baseUrl}}/api/events?channel=lobby`

**Headers:**
```
Accept: text/event-stream
Cache-Control: no-cache
```

**Purpose:** Establish Server-Sent Events connection for real-time updates

**Expected Response:** Stream of events in SSE format:
```
data: {"id":"1234567890","event":"connected","data":{"clientId":"1234567890","channel":"lobby"},"timestamp":1234567890}

data: {"id":"1234567891","event":"heartbeat","data":{"timestamp":1234567891},"timestamp":1234567891}
```

#### Send Event
**Endpoint:** `POST {{baseUrl}}/api/events`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "channel": "lobby",
  "event": "test-message",
  "data": {
    "message": "Hello from Postman!",
    "timestamp": "{{$timestamp}}"
  }
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Event broadcasted"
}
```

### 💬 Chat System Endpoints

#### Send Chat Message
**Endpoint:** `POST {{baseUrl}}/api/chat`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "username": "{{username}}",
  "message": "Hello from Postman!",
  "channel": "lobby"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "chatMessage": {
    "id": 1,
    "username": "testuser",
    "message": "Hello from Postman!",
    "timestamp": "2025-07-20T03:24:00.851Z"
  }
}
```

### 📊 Statistics Endpoints

#### Get User Stats
**Endpoint:** `GET {{baseUrl}}/api/stats/{{username}}`

**Purpose:** Get user's game statistics

**Expected Response:**
```json
{
  "username": "testuser",
  "stats": {
    "games_played": 5,
    "games_won": 3,
    "games_lost": 1,
    "games_drawn": 1,
    "win_rate": 60.0
  }
}
```

### ⚙️ Configuration Endpoints

#### Get Pusher Config
**Endpoint:** `GET {{baseUrl}}/api/pusher-config`

**Purpose:** Get Pusher configuration for client

**Expected Response:**
```json
{
  "key": "your-pusher-key",
  "cluster": "us3",
  "appId": "your-app-id"
}
```

#### Debug Environment
**Endpoint:** `GET {{baseUrl}}/api/debug-env`

**Purpose:** Debug environment variables (development only)

**Expected Response:**
```json
{
  "environment": "development",
  "database": {
    "host": "localhost",
    "port": 5432,
    "database": "tic_tac_toe"
  },
  "pusher": {
    "appId": "set",
    "key": "set",
    "cluster": "us3"
  }
}
```

### 🔌 WebSocket Endpoint

#### WebSocket Endpoint
**Endpoint:** `GET {{baseUrl}}/api/websocket?channel=test&clientId=postman`

**Purpose:** WebSocket connection endpoint (returns info message)

**Expected Response:**
```json
{
  "message": "WebSocket connections are not supported in this API. Use SSE or polling instead.",
  "alternatives": [
    "GET /api/events for Server-Sent Events",
    "POST /api/events for sending events"
  ]
}
```

## Testing Workflow

### 1. Basic Health Check
1. Run the "Health Check" request
2. Verify status is "healthy"
3. Check all subsystems are working

### 2. Authentication Flow
1. Run "Register User" (may fail if user exists - that's OK)
2. Run "Login User" 
3. Verify successful authentication

### 3. Game Management Flow
1. Run "List Games" to see current games
2. Run "Create Game" to create a new game
3. Note the game ID from the response
4. Run "Join Game" with the game ID
5. Run "Make Move" to test game logic

### 4. Real-time Communication
1. Open "SSE Connection" in a separate tab to establish connection
2. Run "Send Event" to broadcast a message
3. Check the SSE connection receives the event

### 5. Chat System
1. Run "Send Chat Message" to test chat functionality
2. Verify message is stored and broadcasted

### 6. Configuration
1. Run "Get Pusher Config" to verify configuration
2. Run "Debug Environment" to check environment setup

## Postman Test Scripts

### Authentication Test
```javascript
pm.test("Authentication successful", function () {
    pm.response.to.have.status(200);
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.user).to.have.property('username');
});
```

### Game Creation Test
```javascript
pm.test("Game created successfully", function () {
    pm.response.to.have.status(200);
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.game).to.have.property('id');
    pm.expect(response.game).to.have.property('status');
    
    // Store game ID for future requests
    if (response.game && response.game.id) {
        pm.environment.set("gameId", response.game.id);
    }
});
```

### SSE Connection Test
```javascript
pm.test("SSE connection established", function () {
    pm.response.to.have.status(200);
    pm.expect(pm.response.headers.get('Content-Type')).to.include('text/event-stream');
});
```

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "error": "Invalid request data",
  "details": "Missing required field: username"
}
```

#### 401 Unauthorized
```json
{
  "error": "Authentication required",
  "message": "Please login to access this resource"
}
```

#### 404 Not Found
```json
{
  "error": "Resource not found",
  "message": "Game not found"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Database connection failed"
}
```

## Performance Testing

### Load Testing with Postman
1. Use Postman's Collection Runner
2. Set iterations to 100
3. Set delay between requests to 100ms
4. Monitor response times and error rates

### Concurrent Users
1. Open multiple Postman tabs
2. Run SSE connections simultaneously
3. Send events from different clients
4. Verify real-time updates work correctly

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if server is running
   - Verify correct port number
   - Check firewall settings

2. **Authentication Errors**
   - Verify username/password
   - Check database connection
   - Ensure user exists

3. **SSE Connection Issues**
   - Check Accept header is set correctly
   - Verify Cache-Control header
   - Monitor server logs for errors

4. **Game Logic Errors**
   - Verify game ID is valid
   - Check player turn logic
   - Ensure board state is valid

### Debug Steps
1. Check server logs for errors
2. Verify database connectivity
3. Test individual endpoints
4. Check environment variables
5. Monitor network requests

## Production Testing

### Vercel Deployment
1. Update `baseUrl` to your Vercel URL
2. Test all endpoints in production
3. Verify real-time features work
4. Check performance under load

### Environment Variables
Ensure all required environment variables are set in Vercel:
- `DATABASE_URL`
- `PUSHER_APP_ID`
- `PUSHER_KEY`
- `PUSHER_SECRET`
- `PUSHER_CLUSTER`

## Conclusion

This Postman collection provides comprehensive testing for all API endpoints. Use the test scripts to automate validation and ensure your API is working correctly in both development and production environments.

For additional testing, consider using the `test-endpoints.js` script included in this project for automated testing. 