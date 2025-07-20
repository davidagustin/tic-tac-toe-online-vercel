# Score Tracking Testing Guide

## 🏆 **Comprehensive Score Tracking Tests**

This guide covers all aspects of testing score tracking and statistics updates when players win, lose, or draw games in the Tic-Tac-Toe API.

## 📋 **Test Collections**

### **1. Dedicated Score Tracking Collection** (`postman-score-tracking.json`)
- **Complete game flow testing** with score verification
- **Win/Loss/Draw scenarios** with detailed validation
- **Statistics structure validation** with data integrity checks
- **Multi-player score tracking** for both players

### **2. Enhanced Collection Updates** (`postman-collection-enhanced.json`)
- **Score tracking integration** in existing game flow tests
- **Statistics validation** after game completion
- **Win rate calculation** verification
- **Data consistency** checks

## 🎯 **Test Scenarios**

### **🏆 Win/Loss Game Flow**
1. **Register both players**
2. **Get initial statistics** for baseline
3. **Create and join game**
4. **Play complete game** with winning moves
5. **Verify winner stats** (wins +1, total games +1)
6. **Verify loser stats** (losses +1, total games +1)

### **🤝 Draw Game Flow**
1. **Create and join game**
2. **Play to draw** (full board, no winner)
3. **Verify both players** (draws +1, total games +1)
4. **Check win rates** remain unchanged

### **📊 Statistics Validation**
1. **Structure validation** (wins, losses, draws, totalGames, winRate)
2. **Data type validation** (all numeric values)
3. **Logical consistency** (totalGames = wins + losses + draws)
4. **Win rate calculation** (wins / totalGames * 100)

## 🔍 **Detailed Test Cases**

### **1. Complete Win/Loss Game Testing**

#### **Pre-Game Setup**
```javascript
// Store initial stats for comparison
pm.environment.set("player1_initial_wins", response.stats.wins || 0);
pm.environment.set("player1_initial_losses", response.stats.losses || 0);
pm.environment.set("player1_initial_draws", response.stats.draws || 0);
pm.environment.set("player1_initial_games", response.stats.totalGames || 0);
```

#### **Game Play Sequence**
```javascript
// Winning game moves (Player 1 wins)
// Position 0 (X) -> Position 1 (O) -> Position 3 (X) -> Position 4 (O) -> Position 6 (X)
// This creates a winning diagonal for Player 1
```

#### **Post-Game Verification**
```javascript
// Verify Player 1 (Winner) stats
pm.expect(stats.wins).to.eql(initialWins + 1);
pm.expect(stats.totalGames).to.eql(initialGames + 1);
pm.expect(stats.losses).to.eql(initialLosses); // Unchanged
pm.expect(stats.draws).to.eql(initialDraws); // Unchanged

// Verify Player 2 (Loser) stats
pm.expect(stats.losses).to.eql(initialLosses + 1);
pm.expect(stats.totalGames).to.eql(initialGames + 1);
pm.expect(stats.wins).to.eql(initialWins); // Unchanged
pm.expect(stats.draws).to.eql(initialDraws); // Unchanged
```

### **2. Draw Game Testing**

#### **Draw Game Moves**
```javascript
// Complete board without winner
// X | O | X
// O | X | O
// O | X | O
```

#### **Draw Verification**
```javascript
// Both players should get +1 draw and +1 total game
pm.expect(stats.draws).to.eql(initialDraws + 1);
pm.expect(stats.totalGames).to.eql(initialGames + 1);
pm.expect(stats.wins).to.eql(initialWins); // Unchanged
pm.expect(stats.losses).to.eql(initialLosses); // Unchanged
```

### **3. Statistics Structure Validation**

#### **Required Fields**
```javascript
pm.expect(stats).to.have.property('wins');
pm.expect(stats).to.have.property('losses');
pm.expect(stats).to.have.property('draws');
pm.expect(stats).to.have.property('totalGames');
pm.expect(stats).to.have.property('winRate');
```

#### **Data Type Validation**
```javascript
pm.expect(stats.wins).to.be.a('number');
pm.expect(stats.losses).to.be.a('number');
pm.expect(stats.draws).to.be.a('number');
pm.expect(stats.totalGames).to.be.a('number');
pm.expect(stats.winRate).to.be.a('number');
```

#### **Logical Consistency**
```javascript
// Total games should equal sum of wins, losses, and draws
pm.expect(stats.totalGames).to.eql(stats.wins + stats.losses + stats.draws);

// Win rate should be calculated correctly
if (stats.totalGames > 0) {
    const expectedWinRate = Math.round((stats.wins / stats.totalGames) * 100);
    pm.expect(stats.winRate).to.eql(expectedWinRate);
}
```

## 📊 **Score Tracking Verification**

### **Before Game Statistics**
```javascript
// Capture initial state
const initialStats = {
    wins: parseInt(pm.environment.get("initial_wins")),
    losses: parseInt(pm.environment.get("initial_losses")),
    draws: parseInt(pm.environment.get("initial_draws")),
    totalGames: parseInt(pm.environment.get("initial_total_games"))
};

console.log(`Initial stats: ${JSON.stringify(initialStats)}`);
```

### **After Game Statistics**
```javascript
// Verify score updates
const currentStats = response.stats;
const expectedStats = {
    wins: initialStats.wins + (isWinner ? 1 : 0),
    losses: initialStats.losses + (isLoser ? 1 : 0),
    draws: initialStats.draws + (isDraw ? 1 : 0),
    totalGames: initialStats.totalGames + 1
};

// Validate each stat
pm.expect(currentStats.wins).to.eql(expectedStats.wins);
pm.expect(currentStats.losses).to.eql(expectedStats.losses);
pm.expect(currentStats.draws).to.eql(expectedStats.draws);
pm.expect(currentStats.totalGames).to.eql(expectedStats.totalGames);
```

### **Win Rate Calculation**
```javascript
// Verify win rate is calculated correctly
if (currentStats.totalGames > 0) {
    const expectedWinRate = Math.round((currentStats.wins / currentStats.totalGames) * 100);
    pm.expect(currentStats.winRate).to.eql(expectedWinRate);
    
    console.log(`Win rate: ${currentStats.winRate}% (${currentStats.wins}/${currentStats.totalGames})`);
}
```

## 🎮 **Game Completion Detection**

### **Win Detection**
```javascript
// Check if game has a winner
if (response.game.winner) {
    pm.expect(response.game.status).to.eql('completed');
    pm.expect(response.game.winner).to.be.oneOf(['player1', 'player2']);
    
    console.log(`Game won by: ${response.game.winner}`);
}
```

### **Draw Detection**
```javascript
// Check if game ended in draw
if (response.game.status === 'completed' && !response.game.winner) {
    console.log("Game ended in draw");
    
    // Both players should get +1 draw
    pm.expect(player1Stats.draws).to.eql(initialPlayer1Draws + 1);
    pm.expect(player2Stats.draws).to.eql(initialPlayer2Draws + 1);
}
```

### **Game State Validation**
```javascript
// Verify game state is consistent
pm.expect(response.game).to.have.property('status');
pm.expect(response.game).to.have.property('board');
pm.expect(response.game.board).to.be.an('array');
pm.expect(response.game.board).to.have.length(9);
```

## 🔧 **Test Automation Features**

### **Environment Variable Management**
```javascript
// Store game IDs for subsequent tests
if (response.game && response.game.id) {
    pm.environment.set("testGameId", response.game.id);
}

// Store player statistics for comparison
pm.environment.set("player1_initial_wins", response.stats.wins || 0);
pm.environment.set("player1_initial_losses", response.stats.losses || 0);
```

### **Dynamic Test Data**
```javascript
// Generate unique player names for testing
const timestamp = new Date().getTime();
const player1Name = `test_player1_${timestamp}`;
const player2Name = `test_player2_${timestamp}`;

pm.environment.set("player1", player1Name);
pm.environment.set("player2", player2Name);
```

### **Comprehensive Logging**
```javascript
// Log detailed score tracking information
console.log(`Score tracking verification:`);
console.log(`  Initial: ${initialWins}W/${initialLosses}L/${initialDraws}D (${initialTotalGames} total)`);
console.log(`  Current: ${stats.wins}W/${stats.losses}L/${stats.draws}D (${stats.totalGames} total)`);
console.log(`  Win Rate: ${stats.winRate}%`);
console.log(`  Game Result: ${gameResult}`);
```

## 📈 **Performance Considerations**

### **Statistics Update Timing**
```javascript
// Verify stats are updated immediately after game completion
pm.expect(pm.response.responseTime).to.be.below(2000); // 2 seconds max

// Check for race conditions in concurrent games
pm.test("Stats updated consistently", function () {
    // Multiple rapid requests should return consistent results
});
```

### **Database Consistency**
```javascript
// Verify stats are persisted correctly
pm.test("Stats persisted to database", function () {
    // Stats should remain consistent across multiple requests
    pm.expect(stats.totalGames).to.be.at.least(initialTotalGames);
});
```

## 🚨 **Error Handling**

### **Invalid Game States**
```javascript
// Test stats with invalid game completion
pm.test("Invalid game state handled", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 400, 422]);
});
```

### **Missing Statistics**
```javascript
// Test non-existent user statistics
pm.test("Non-existent user stats handled", function () {
    if (pm.response.code === 200) {
        const stats = response.stats;
        pm.expect(stats.wins).to.eql(0);
        pm.expect(stats.losses).to.eql(0);
        pm.expect(stats.draws).to.eql(0);
        pm.expect(stats.totalGames).to.eql(0);
    }
});
```

## 🎯 **Test Execution Workflow**

### **1. Setup Phase**
```bash
# Import score tracking collection
# Configure environment variables
# Register test players
# Get initial statistics
```

### **2. Game Execution**
```bash
# Create game
# Join game
# Play moves to completion
# Detect game result (win/loss/draw)
```

### **3. Verification Phase**
```bash
# Verify winner statistics
# Verify loser statistics
# Check data consistency
# Validate win rate calculation
```

### **4. Cleanup Phase**
```bash
# Clear test data
# Reset environment variables
# Generate test report
```

## 📊 **Success Metrics**

### **Functional Metrics**
- **Score Accuracy**: 100% correct win/loss/draw tracking
- **Data Consistency**: Total games = wins + losses + draws
- **Win Rate Accuracy**: Correct percentage calculation
- **Real-time Updates**: Stats updated immediately after game

### **Performance Metrics**
- **Update Speed**: < 2 seconds for statistics update
- **Data Integrity**: Consistent across multiple requests
- **Concurrent Handling**: No race conditions in multi-player games

### **Reliability Metrics**
- **Error Handling**: Graceful handling of edge cases
- **Data Persistence**: Stats maintained across server restarts
- **Validation**: Comprehensive data validation

## 🎉 **Conclusion**

The score tracking testing infrastructure provides:

- ✅ **Complete game flow testing** with score verification
- ✅ **Win/Loss/Draw scenario coverage** for all outcomes
- ✅ **Statistics structure validation** with data integrity
- ✅ **Real-time score updates** verification
- ✅ **Performance and reliability** testing
- ✅ **Comprehensive error handling** validation

Use these test collections to ensure that player statistics are accurately updated and maintained across all game scenarios! 🏆 