const { Server } = require('socket.io');
const { createServer } = require('http');
const crypto = require('crypto');

// Mock database functions for now
const initializeDatabase = async () => {
  console.log('Mock database initialized');
};

const saveLobbyMessage = async (text, userName) => {
  console.log('Mock: Saving lobby message:', { text, userName });
  return { id: Date.now(), timestamp: new Date() };
};

const getLobbyMessages = async (limit = 100) => {
  console.log('Mock: Getting lobby messages');
  return [
    { id: 1, text: 'Welcome to the Tic-Tac-Toe Game Lobby! 🎮', user_name: 'System', timestamp: new Date() },
    { id: 2, text: 'Feel free to chat while waiting for games! 💬', user_name: 'System', timestamp: new Date() }
  ];
};

const saveGameMessage = async (gameId, text, userName) => {
  console.log('Mock: Saving game message:', { gameId, text, userName });
  return { id: Date.now(), timestamp: new Date() };
};

const getGameMessages = async (gameId, limit = 50) => {
  console.log('Mock: Getting game messages for:', gameId);
  return [];
};

const cleanupOldMessages = async () => {
  console.log('Mock: Cleaning up old messages');
};

// Import auth service
const { AuthService } = require('./lib/auth');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // Allow external connections
const socketPort = process.env.PORT || 3001;

// Initialize database
initializeDatabase().then(() => {
  console.log('Database initialized successfully');
}).catch(error => {
  console.error('Database initialization failed:', error);
});

// Create HTTP server
const httpServer = createServer();

// Create Socket.IO server with CORS configuration for production
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL || "https://tic-tac-toe-online-vercel.vercel.app"
      : ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true
});

// In-memory storage for games
const games = new Map();
const gameCreators = new Map(); // Track which user created which game
const players = new Map(); // socketId -> { userName, gameId }
const socketRateLimits = new Map(); // socketId -> { count, resetTime }
const MAX_CHAT_MESSAGES = 100;
const MAX_GAME_CHAT_MESSAGES = 50;

// Clean up old messages periodically
async function performCleanup() {
  try {
    await cleanupOldMessages();
    console.log('Database cleanup completed');
  } catch (error) {
    console.error('Error during database cleanup:', error);
  }
}

// Run cleanup every hour
setInterval(performCleanup, 60 * 60 * 1000);

// Security configuration
const SECURITY_CONFIG = {
  MAX_MESSAGE_LENGTH: 500,
  MAX_USERNAME_LENGTH: 50,
  MAX_GAME_NAME_LENGTH: 100,
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  SOCKET_RATE_LIMIT_MAX: 50,
  ALLOWED_CHARACTERS: /^[a-zA-Z0-9\s\-_.,!?@#$%^&*()+=:;"'<>[\]{}|\\/~`]+$/,
  ALLOWED_USERNAME_CHARACTERS: /^[a-zA-Z0-9\s\-_]+$/,
  ALLOWED_GAME_NAME_CHARACTERS: /^[a-zA-Z0-9\s\-_.,!?()]+$/,
  MAX_BOARD_INDEX: 8,
  MIN_BOARD_INDEX: 0,
  MAX_GAMES_PER_USER: 5,
  MAX_PLAYERS_PER_GAME: 2,
};

// Security validation functions
function sanitizeInput(input, maxLength, allowedPattern) {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid input type');
  }

  let sanitized = input.trim();

  if (sanitized.length > maxLength) {
    throw new Error(`Input too long. Maximum ${maxLength} characters allowed.`);
  }

  if (sanitized.length === 0) {
    throw new Error('Input cannot be empty');
  }

  if (!allowedPattern.test(sanitized)) {
    throw new Error('Input contains invalid characters');
  }

  // Remove potential XSS vectors
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  return sanitized;
}

function validateUsername(username) {
  return sanitizeInput(username, SECURITY_CONFIG.MAX_USERNAME_LENGTH, SECURITY_CONFIG.ALLOWED_USERNAME_CHARACTERS);
}

function validateGameName(gameName) {
  return sanitizeInput(gameName, SECURITY_CONFIG.MAX_GAME_NAME_LENGTH, SECURITY_CONFIG.ALLOWED_GAME_NAME_CHARACTERS);
}

function validateMessage(message) {
  return sanitizeInput(message, SECURITY_CONFIG.MAX_MESSAGE_LENGTH, SECURITY_CONFIG.ALLOWED_CHARACTERS);
}

function validateBoardIndex(index) {
  if (typeof index !== 'number' || !Number.isInteger(index)) {
    throw new Error('Invalid board index type');
  }

  if (index < SECURITY_CONFIG.MIN_BOARD_INDEX || index > SECURITY_CONFIG.MAX_BOARD_INDEX) {
    throw new Error('Invalid board index');
  }

  return index;
}

function validateGameId(gameId) {
  if (!gameId || typeof gameId !== 'string') {
    throw new Error('Invalid game ID');
  }

  if (!/^\d+$/.test(gameId)) {
    throw new Error('Invalid game ID format');
  }

  return gameId;
}

function validatePlayerSymbol(symbol) {
  if (symbol !== 'X' && symbol !== 'O') {
    throw new Error('Invalid player symbol');
  }
  return symbol;
}

// Rate limiting for sockets
function checkSocketRateLimit(socketId) {
  const now = Date.now();
  const current = socketRateLimits.get(socketId);
  
  if (!current || current.resetTime < now) {
    socketRateLimits.set(socketId, {
      count: 1,
      resetTime: now + SECURITY_CONFIG.RATE_LIMIT_WINDOW
    });
    return true;
  }

  if (current.count >= SECURITY_CONFIG.SOCKET_RATE_LIMIT_MAX) {
    return false;
  }

  current.count++;
  return true;
}

// Security logging
function logSecurityEvent(event, details, severity = 'low') {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    details,
    severity,
    environment: process.env.NODE_ENV || 'development'
  };

  if (process.env.NODE_ENV === 'production') {
    console.error('SECURITY EVENT:', JSON.stringify(logEntry));
  } else {
    console.warn('SECURITY EVENT:', JSON.stringify(logEntry));
  }
}

// Validate socket connection
function validateSocketConnection(socket) {
  // Basic validation - in production you might want more sophisticated validation
  if (!socket || !socket.id) {
    throw new Error('Invalid socket connection');
  }
  return true;
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  try {
    validateSocketConnection(socket);
    console.log('made socket connection', socket.id);
    
    // Add connection debugging
    console.log('Client connected from:', socket.handshake.address);
    console.log('Client headers:', socket.handshake.headers.origin);
    
    // Rate limiting for new connections
    if (!checkSocketRateLimit(socket.id)) {
      logSecurityEvent('CONNECTION_RATE_LIMIT_EXCEEDED', { socketId: socket.id }, 'medium');
      socket.disconnect();
      return;
    }

    // Handle lobby chat messages
    socket.on('send lobby message', async (data) => {
      try {
        // Rate limiting
        if (!checkSocketRateLimit(socket.id)) {
          logSecurityEvent('SOCKET_RATE_LIMIT_EXCEEDED', { socketId: socket.id }, 'medium');
          socket.emit('error', { message: 'Rate limit exceeded' });
          return;
        }

        // Validate inputs
        if (!data || !data.text || !data.userName) {
          logSecurityEvent('INVALID_LOBBY_MESSAGE_DATA', { socketId: socket.id, data }, 'low');
          socket.emit('error', { message: 'Invalid message data' });
          return;
        }

        const validatedText = validateMessage(data.text);
        const validatedUserName = validateUsername(data.userName);

        // Save message to database
        const savedMessage = await saveLobbyMessage(validatedText, validatedUserName);
        console.log('Lobby chat message saved:', savedMessage);

        // Broadcast to all clients
        io.emit('lobby message', {
          id: savedMessage.id,
          text: validatedText,
          userName: validatedUserName,
          timestamp: savedMessage.timestamp
        });

      } catch (error) {
        console.error('Error handling lobby message:', error);
        logSecurityEvent('LOBBY_MESSAGE_ERROR', { socketId: socket.id, error: error.message }, 'low');
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle get lobby messages request
    socket.on('get lobby messages', async () => {
      try {
        const messages = await getLobbyMessages(MAX_CHAT_MESSAGES);
        socket.emit('lobby messages', messages);
      } catch (error) {
        console.error('Error getting lobby messages:', error);
        socket.emit('error', { message: 'Failed to get messages' });
      }
    });

    // Handle create game event with security
    socket.on('create game', (data) => {
      try {
        // Rate limiting for socket events
        if (!checkSocketRateLimit(socket.id)) {
          logSecurityEvent('SOCKET_RATE_LIMIT_EXCEEDED', { socketId: socket.id }, 'medium');
          socket.emit('error', { message: 'Rate limit exceeded. Please wait before trying again.' });
          return;
        }

        // Validate inputs
        if (!data || !data.name || !data.createdBy) {
          logSecurityEvent('INVALID_CREATE_GAME_DATA', { socketId: socket.id, data }, 'low');
          socket.emit('error', { message: 'Invalid game data provided.' });
          return;
        }

        // Check if user already has a game
        const existingGameId = gameCreators.get(data.createdBy);
        if (existingGameId) {
          const existingGame = games.get(existingGameId);
          if (existingGame && existingGame.status !== 'finished') {
            logSecurityEvent('DUPLICATE_GAME_CREATION_ATTEMPT', { 
              socketId: socket.id, 
              userName: data.createdBy, 
              existingGameId 
            }, 'low');
            socket.emit('error', { 
              message: 'You already have an active game. Please finish or delete your current game before creating a new one.',
              existingGameId: existingGameId
            });
            return;
          }
        }

        // Validate and sanitize game name
        const validatedGameName = validateGameName(data.name);
        if (!validatedGameName) {
          logSecurityEvent('INVALID_GAME_NAME', { socketId: socket.id, gameName: data.name }, 'low');
          socket.emit('error', { message: 'Invalid game name. Please use only letters, numbers, spaces, and basic punctuation.' });
          return;
        }

        // Create new game
        const newGame = {
          id: Date.now().toString(),
          name: validatedGameName,
          players: [data.createdBy],
          status: 'waiting',
          createdBy: data.createdBy,
          createdAt: new Date(),
          board: Array(9).fill(null),
          currentPlayer: null, // Will be set when game starts
          winner: null
        };

        // Store game and track creator
        games.set(newGame.id, newGame);
        gameCreators.set(data.createdBy, newGame.id);

        console.log('Game created:', newGame);
        logSecurityEvent('GAME_CREATED', { 
          socketId: socket.id, 
          gameId: newGame.id, 
          createdBy: data.createdBy 
        }, 'low');

        // Notify all clients about the new game
        io.sockets.emit('game created', newGame);
        socket.emit('game created success', newGame);

      } catch (error) {
        console.error('Error creating game:', error);
        logSecurityEvent('GAME_CREATION_ERROR', { 
          socketId: socket.id, 
          error: error.message 
        }, 'medium');
        socket.emit('error', { message: 'Failed to create game. Please try again.' });
      }
    });

    // Handle join game event with security
    socket.on('join game', (gameId, userName) => {
      try {
        // Rate limiting for socket events
        if (!checkSocketRateLimit(socket.id)) {
          logSecurityEvent('SOCKET_RATE_LIMIT_EXCEEDED', { socketId: socket.id }, 'medium');
          socket.emit('error', { message: 'Rate limit exceeded. Please wait before trying again.' });
          return;
        }

        // Validate inputs
        if (!gameId || !userName) {
          logSecurityEvent('INVALID_JOIN_GAME_DATA', { socketId: socket.id, gameId, userName }, 'low');
          socket.emit('error', { message: 'Invalid game ID or username.' });
          return;
        }

        const validatedUserName = validateUsername(userName);
        if (!validatedUserName) {
          logSecurityEvent('INVALID_USERNAME_JOIN_GAME', { socketId: socket.id, userName }, 'low');
          socket.emit('error', { message: 'Invalid username format.' });
          return;
        }

        // Find the game
        const game = games.get(gameId);
        if (!game) {
          logSecurityEvent('GAME_NOT_FOUND', { socketId: socket.id, gameId }, 'low');
          socket.emit('error', { message: 'Game not found.' });
          return;
        }

        // Check if game is full
        if (game.players.length >= 2) {
          logSecurityEvent('GAME_FULL_JOIN_ATTEMPT', { socketId: socket.id, gameId }, 'low');
          socket.emit('error', { message: 'Game is full.' });
          return;
        }

        // Check if user is already in the game
        if (game.players.includes(validatedUserName)) {
          logSecurityEvent('DUPLICATE_JOIN_ATTEMPT', { socketId: socket.id, gameId, userName: validatedUserName }, 'low');
          socket.emit('error', { message: 'You are already in this game.' });
          return;
        }

        // Add player to game
        game.players.push(validatedUserName);
        players.set(socket.id, { userName: validatedUserName, gameId });

        console.log('Player joined game:', validatedUserName, 'joined game:', gameId);
        logSecurityEvent('PLAYER_JOINED_GAME', { 
          socketId: socket.id, 
          gameId, 
          userName: validatedUserName 
        }, 'low');

        // If game is now full, start it
        if (game.players.length === 2) {
          game.status = 'playing';
          // Randomize who goes first
          game.currentPlayer = Math.random() < 0.5 ? 'X' : 'O';
          console.log('Game started:', gameId, 'First player:', game.currentPlayer);
          logSecurityEvent('GAME_STARTED', { gameId, players: game.players, firstPlayer: game.currentPlayer }, 'low');
          io.sockets.emit('game started', gameId);
        }

        // Notify all clients about the updated game
        io.sockets.emit('game joined', gameId, validatedUserName);
        io.sockets.emit('game updated', game);

      } catch (error) {
        console.error('Error joining game:', error);
        logSecurityEvent('JOIN_GAME_ERROR', { 
          socketId: socket.id, 
          error: error.message 
        }, 'medium');
        socket.emit('error', { message: 'Failed to join game. Please try again.' });
      }
    });

    // Handle game finished event
    socket.on('game finished', (gameId, winner) => {
      try {
        const game = games.get(gameId);
        if (game) {
          game.status = 'finished';
          game.winner = winner;
          
          console.log('Game finished:', gameId, 'Winner:', winner);
          logSecurityEvent('GAME_FINISHED', { 
            socketId: socket.id, 
            gameId, 
            winner 
          }, 'low');

          // Remove game creator tracking for finished games
          if (game.createdBy) {
            const creatorGameId = gameCreators.get(game.createdBy);
            if (creatorGameId === gameId) {
              gameCreators.delete(game.createdBy);
              console.log('Removed game creator tracking for:', game.createdBy);
            }
          }

          // Notify all clients
          io.sockets.emit('game updated', game);
        }
      } catch (error) {
        console.error('Error handling game finished:', error);
      }
    });

    // Handle get games request
    socket.on('get games', () => {
      try {
        const gamesList = Array.from(games.values());
        socket.emit('games list', gamesList);
      } catch (error) {
        console.error('Error getting games list:', error);
        socket.emit('error', { message: 'Failed to get games list.' });
      }
    });

    // Handle get game request
    socket.on('get game', (gameId) => {
      try {
        // Rate limiting
        if (!checkSocketRateLimit(socket.id)) {
          logSecurityEvent('SOCKET_RATE_LIMIT_EXCEEDED', { socketId: socket.id }, 'medium');
          socket.emit('error', { message: 'Rate limit exceeded' });
          return;
        }

        // Validate inputs
        const validatedGameId = validateGameId(gameId);
        
        console.log('Sending game data for gameId:', validatedGameId);
        const game = games.get(validatedGameId);
        if (game) {
          socket.emit('game data', game);
          console.log('Game data sent:', game);
        } else {
          console.log('Game not found:', validatedGameId);
          socket.emit('error', { message: 'Game not found' });
        }
      } catch (error) {
        logSecurityEvent('GET_GAME_ERROR', { socketId: socket.id, error: error.message }, 'low');
        socket.emit('error', { message: 'Failed to get game' });
      }
    });

    socket.on('make move', (gameId, index, player) => {
      try {
        // Rate limiting
        if (!checkSocketRateLimit(socket.id)) {
          logSecurityEvent('SOCKET_RATE_LIMIT_EXCEEDED', { socketId: socket.id }, 'medium');
          socket.emit('error', { message: 'Rate limit exceeded' });
          return;
        }

        // Validate inputs
        const validatedGameId = validateGameId(gameId);
        const validatedIndex = validateBoardIndex(index);
        const validatedPlayer = validatePlayerSymbol(player);
        
        console.log('Making move:', validatedGameId, validatedIndex, validatedPlayer);
        
        const game = games.get(validatedGameId);
        console.log('Game found:', game);
        console.log('Game status:', game?.status);
        console.log('Board at index:', game?.board?.[validatedIndex]);
        console.log('Board:', game?.board);
        
        if (game && game.status === 'playing' && game.board[validatedIndex] === null) {
          console.log('Move is valid, updating board...');
          game.board[validatedIndex] = validatedPlayer;
          game.currentPlayer = validatedPlayer === 'X' ? 'O' : 'X';
          
          // Check for winner
          const winner = checkWinner(game.board);
          if (winner) {
            game.winner = winner;
            game.status = 'finished';
          } else if (game.board.every(cell => cell !== null)) {
            game.status = 'finished';
          }
          
          // Log move
          logSecurityEvent('MOVE_MADE', { 
            gameId: validatedGameId, 
            index: validatedIndex, 
            player: validatedPlayer 
          }, 'low');
          
          // Broadcast move to all clients
          io.emit('move made', validatedGameId, validatedIndex, validatedPlayer, game.currentPlayer, game.winner, game.status);
          console.log('Move broadcasted successfully');
        } else {
          console.log('Move validation failed:');
          console.log('- Game exists:', !!game);
          console.log('- Game status is playing:', game?.status === 'playing');
          console.log('- Board position is empty:', game?.board?.[validatedIndex] === null);
          socket.emit('error', { message: 'Invalid move' });
        }
      } catch (error) {
        console.log('Move error caught:', error.message);
        logSecurityEvent('MOVE_ERROR', { socketId: socket.id, error: error.message }, 'low');
        socket.emit('error', { message: 'Invalid move' });
      }
    });

    // Handle reset game event
    socket.on('reset game', (gameId) => {
      try {
        const game = games.get(gameId);
        if (game && game.status === 'finished') {
          console.log('Resetting game:', gameId);
          
          // Reset game state
          game.board = Array(9).fill(null);
          game.currentPlayer = Math.random() < 0.5 ? 'X' : 'O'; // Randomize first player on reset
          game.winner = null;
          game.status = 'playing';
          
          console.log('Game reset successfully:', gameId);
          
          // Notify all clients
          io.emit('game reset', gameId);
          io.emit('game updated', game);
        }
      } catch (error) {
        console.error('Error resetting game:', error);
      }
    });

    // Handle leave game event
    socket.on('leave game', (gameId, userName) => {
      try {
        const game = games.get(gameId);
        if (game) {
          console.log('Player leaving game:', userName, 'from game:', gameId);
          
          // Remove player from game
          const playerIndex = game.players.indexOf(userName);
          if (playerIndex > -1) {
            game.players.splice(playerIndex, 1);
          }
          
          // Remove player tracking
          players.delete(socket.id);
          
          // If no players left, remove the game
          if (game.players.length === 0) {
            console.log('No players left, removing game:', gameId);
            games.delete(gameId);
            
            // Remove game creator tracking
            if (game.createdBy) {
              const creatorGameId = gameCreators.get(game.createdBy);
              if (creatorGameId === gameId) {
                gameCreators.delete(game.createdBy);
              }
            }
            
            io.emit('game removed', gameId);
          } else {
            // Reset game to waiting state
            game.status = 'waiting';
            game.board = Array(9).fill(null);
            game.currentPlayer = 'X';
            game.winner = null;
            
            console.log('Game reset to waiting state due to player leaving');
            
            // Update game
            const updatedGame = {
              ...game,
              players: game.players
            };
            
            console.log('Game updated after player left:', updatedGame);
            
            // Notify all clients
            io.emit('player left game', gameId, userName, updatedGame);
            io.emit('game updated', updatedGame);
          }
        }
      } catch (error) {
        console.error('Error handling leave game:', error);
      }
    });

    // Handle user signout event
    socket.on('user signout', (userName) => {
      try {
        console.log('User signing out:', userName);
        
        // Find all games where this user is a player
        for (const [gameId, game] of games.entries()) {
          if (game.players.includes(userName)) {
            console.log('Removing user from game:', userName, 'Game ID:', gameId);
            
            // Remove user from the game
            const playerIndex = game.players.indexOf(userName);
            if (playerIndex !== -1) {
              game.players.splice(playerIndex, 1);
              
              // If no players left, remove the game after a delay to prevent race conditions
              if (game.players.length === 0) {
                console.log('No players left, scheduling game removal:', gameId);
                
                // Remove game creator tracking
                if (game.createdBy) {
                  const creatorGameId = gameCreators.get(game.createdBy);
                  if (creatorGameId === gameId) {
                    gameCreators.delete(game.createdBy);
                  }
                }
                
                // Delay game removal to prevent race conditions with joining
                setTimeout(() => {
                  if (games.has(gameId)) {
                    const currentGame = games.get(gameId);
                    if (currentGame && currentGame.players.length === 0) {
                      console.log('Removing game after delay:', gameId);
                      games.delete(gameId);
                      io.emit('game removed', gameId);
                    }
                  }
                }, 2000); // 2 second delay
              } else {
                // Reset game to waiting state
                game.status = 'waiting';
                game.board = Array(9).fill(null);
                game.currentPlayer = 'X';
                game.winner = null;
                
                console.log('Game reset to waiting state due to player sign out');
                
                // Notify remaining players
                io.emit('player left game', gameId, userName, game);
                io.emit('game updated', game);
              }
            }
          }
        }
        
        // Remove player from players map
        players.delete(socket.id);
        
        console.log('User sign out cleanup completed for:', userName);
        
      } catch (error) {
        console.error('Error handling user sign out:', error);
        logSecurityEvent('USER_SIGNOUT_ERROR', { socketId: socket.id, userName, error: error.message }, 'medium');
      }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log('socket disconnected', socket.id, 'reason:', reason);
      console.log('Disconnect details - Address:', socket.handshake.address, 'Origin:', socket.handshake.headers.origin);
      
      // Clean up player tracking
      const playerData = players.get(socket.id);
      if (playerData) {
        const { userName, gameId } = playerData;
        
        // Ensure userName is valid
        if (!userName || typeof userName !== 'string') {
          console.log('Invalid userName in playerData:', userName);
          players.delete(socket.id);
          return;
        }
        
        const game = games.get(gameId);
        
        if (game) {
          console.log('Player leaving game:', userName, 'from game:', gameId);
          
          // Remove player from game
          const playerIndex = game.players.indexOf(userName);
          if (playerIndex > -1) {
            game.players.splice(playerIndex, 1);
          }
          
          // If no players left, remove the game after a delay to prevent race conditions
          if (game.players.length === 0) {
            console.log('No players left, scheduling game removal:', gameId);
            
            // Remove game creator tracking
            if (game.createdBy) {
              const creatorGameId = gameCreators.get(game.createdBy);
              if (creatorGameId === gameId) {
                gameCreators.delete(game.createdBy);
              }
            }
            
            // Delay game removal to prevent race conditions with joining
            setTimeout(() => {
              if (games.has(gameId)) {
                const currentGame = games.get(gameId);
                if (currentGame && currentGame.players.length === 0) {
                  console.log('Removing game after delay:', gameId);
                  games.delete(gameId);
                  io.emit('game removed', gameId);
                }
              }
            }, 2000); // 2 second delay
          } else {
            // Reset game to waiting state
            game.status = 'waiting';
            game.board = Array(9).fill(null);
            game.currentPlayer = 'X';
            game.winner = null;
            
            console.log('Game reset to waiting state due to player leaving');
            
            // Update game
            const updatedGame = {
              ...game,
              players: game.players
            };
            
            console.log('Game updated after player left:', updatedGame);
            
            // Notify all clients with valid userName
            io.emit('player left game', gameId, userName, updatedGame);
            io.emit('game updated', updatedGame);
          }
        }
        
        players.delete(socket.id);
      }
      
      // Clean up rate limiting
      socketRateLimits.delete(socket.id);
    });

  } catch (error) {
    console.error('Error in socket connection:', error);
    logSecurityEvent('SOCKET_CONNECTION_ERROR', { socketId: socket.id, error: error.message }, 'medium');
    socket.disconnect();
  }

  // Helper function to check for winner
  function checkWinner(board) {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6] // diagonals
    ];
    
    for (let line of lines) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  }
});

// Start the server
httpServer.listen(socketPort, hostname, (err) => {
  if (err) throw err;
  console.log(`> Socket.IO server ready on http://${hostname}:${socketPort}`);
  console.log(`> Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`> Frontend URL: ${process.env.FRONTEND_URL || 'Not set'}`);
  }
}); 