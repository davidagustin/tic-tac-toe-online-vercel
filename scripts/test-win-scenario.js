const { io } = require('socket.io-client');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testWinScenario() {
  console.log('🎮 Testing complete win scenario with immediate statistics update...\n');

  // Create two socket connections for two players
  const socket1 = io('http://localhost:3000');
  const socket2 = io('http://localhost:3000');

  const player1 = 'TestPlayer1';
  const player2 = 'TestPlayer2';

  try {
    // Wait for connections
    await new Promise(resolve => {
      socket1.on('connect', () => {
        console.log('✅ Player 1 connected:', socket1.id);
        socket2.on('connect', () => {
          console.log('✅ Player 2 connected:', socket2.id);
          resolve();
        });
      });
    });

    // Player 1 creates a game
    console.log('\n📝 Player 1 creating game...');
    socket1.emit('create game', { name: 'Test Win Game', userName: player1 });

    let gameId;
    await new Promise(resolve => {
      socket1.on('game created', (data) => {
        gameId = data.gameId;
        console.log('✅ Game created:', gameId);
        resolve();
      });
    });

    // Player 2 joins the game
    console.log('\n👥 Player 2 joining game...');
    socket2.emit('join game', { gameId, userName: player2 });

    await new Promise(resolve => {
      socket2.on('game joined', (data) => {
        console.log('✅ Player 2 joined game');
        resolve();
      });
    });

    // Wait for game to start
    console.log('\n🎯 Waiting for game to start...');
    await new Promise(resolve => {
      socket1.on('game started', (data) => {
        console.log('✅ Game started! First player:', data.firstPlayer);
        resolve();
      });
    });

    // Get initial statistics
    console.log('\n📊 Getting initial statistics...');
    socket1.emit('get user statistics', { userName: player1 });
    socket2.emit('get user statistics', { userName: player2 });

    let player1InitialStats, player2InitialStats;
    await new Promise(resolve => {
      let statsReceived = 0;
      socket1.on('user statistics', (data) => {
        player1InitialStats = data;
        console.log('📊 Player 1 initial stats:', data);
        statsReceived++;
        if (statsReceived === 2) resolve();
      });
      socket2.on('user statistics', (data) => {
        player2InitialStats = data;
        console.log('📊 Player 2 initial stats:', data);
        statsReceived++;
        if (statsReceived === 2) resolve();
      });
    });

    // Play moves to create a winning scenario (X wins in top row)
    console.log('\n🎮 Playing moves to create win scenario...');
    
    // Move 1: X plays at position 0
    console.log('Move 1: X plays at position 0');
    socket1.emit('make move', { gameId, index: 0, userName: player1 });
    
    await new Promise(resolve => {
      socket1.on('move made', (data) => {
        console.log('✅ Move 1 completed');
        resolve();
      });
    });

    // Move 2: O plays at position 4 (center)
    console.log('Move 2: O plays at position 4');
    socket2.emit('make move', { gameId, index: 4, userName: player2 });
    
    await new Promise(resolve => {
      socket2.on('move made', (data) => {
        console.log('✅ Move 2 completed');
        resolve();
      });
    });

    // Move 3: X plays at position 1
    console.log('Move 3: X plays at position 1');
    socket1.emit('make move', { gameId, index: 1, userName: player1 });
    
    await new Promise(resolve => {
      socket1.on('move made', (data) => {
        console.log('✅ Move 3 completed');
        resolve();
      });
    });

    // Move 4: O plays at position 8 (bottom right)
    console.log('Move 4: O plays at position 8');
    socket2.emit('make move', { gameId, index: 8, userName: player2 });
    
    await new Promise(resolve => {
      socket2.on('move made', (data) => {
        console.log('✅ Move 4 completed');
        resolve();
      });
    });

    // Move 5: X plays at position 2 (WINNING MOVE!)
    console.log('Move 5: X plays at position 2 (WINNING MOVE!)');
    socket1.emit('make move', { gameId, index: 2, userName: player1 });
    
    let gameWon = false;
    await new Promise(resolve => {
      socket1.on('move made', (data) => {
        console.log('✅ Move 5 completed');
        if (data.winner) {
          gameWon = true;
          console.log('🏆 GAME WON! Winner:', data.winner);
        }
        resolve();
      });
    });

    if (!gameWon) {
      console.log('❌ Game was not won as expected');
      return;
    }

    // Wait a moment for statistics to update
    console.log('\n⏳ Waiting for statistics to update...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get updated statistics
    console.log('\n📊 Getting updated statistics...');
    socket1.emit('get user statistics', { userName: player1 });
    socket2.emit('get user statistics', { userName: player2 });

    let player1UpdatedStats, player2UpdatedStats;
    await new Promise(resolve => {
      let statsReceived = 0;
      socket1.on('user statistics', (data) => {
        player1UpdatedStats = data;
        console.log('📊 Player 1 updated stats:', data);
        statsReceived++;
        if (statsReceived === 2) resolve();
      });
      socket2.on('user statistics', (data) => {
        player2UpdatedStats = data;
        console.log('📊 Player 2 updated stats:', data);
        statsReceived++;
        if (statsReceived === 2) resolve();
      });
    });

    // Verify statistics were updated
    console.log('\n🔍 Verifying statistics update...');
    
    if (player1UpdatedStats.wins > player1InitialStats.wins) {
      console.log('✅ Player 1 wins increased:', player1InitialStats.wins, '→', player1UpdatedStats.wins);
    } else {
      console.log('❌ Player 1 wins did not increase');
    }

    if (player2UpdatedStats.losses > player2InitialStats.losses) {
      console.log('✅ Player 2 losses increased:', player2InitialStats.losses, '→', player2UpdatedStats.losses);
    } else {
      console.log('❌ Player 2 losses did not increase');
    }

    if (player1UpdatedStats.total_games > player1InitialStats.total_games) {
      console.log('✅ Player 1 total games increased:', player1InitialStats.total_games, '→', player1UpdatedStats.total_games);
    } else {
      console.log('❌ Player 1 total games did not increase');
    }

    if (player2UpdatedStats.total_games > player2InitialStats.total_games) {
      console.log('✅ Player 2 total games increased:', player2InitialStats.total_games, '→', player2UpdatedStats.total_games);
    } else {
      console.log('❌ Player 2 total games did not increase');
    }

    console.log('\n🎉 Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up
    socket1.disconnect();
    socket2.disconnect();
    console.log('\n🧹 Disconnected sockets');
  }
}

// Run the test
testWinScenario(); 