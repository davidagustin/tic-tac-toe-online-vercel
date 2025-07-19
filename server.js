const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const crypto = require('crypto');

// Import database functions for chat persistence
const { 
  initializeDatabase, 
  saveLobbyMessage, 
  getLobbyMessages, 
  saveGameMessage, 
  getGameMessages,
  cleanupOldMessages 
} = require('./lib/db');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// In-memory storage for games (chat is now persistent in database)
const games = new Map();
const gameCreators = new Map(); // Track which user created which game
const players = new Map(); // socketId -> { userName, gameId }
const socketRateLimits = new Map(); // socketId -> { count, resetTime }
const MAX_CHAT_MESSAGES = 100;
const MAX_GAME_CHAT_MESSAGES = 50;

// Clean up old messages periodically using database
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
  if (!socket || !socket.id) {
    return false;
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(socket.id)) {
    return false;
  }

  return true;
}

app.prepare().then(async () => {
  // Initialize database
  try {
    await initializeDatabase();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? process.env.ALLOWED_ORIGINS?.split(',') : "*",
      methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 10000,
    allowEIO3: true,
    maxHttpBufferSize: 1e6
  });

  io.on('connection', (socket) => {
    // Validate socket connection
    if (!validateSocketConnection(socket)) {
      logSecurityEvent('INVALID_SOCKET_CONNECTION', { socketId: socket.id }, 'high');
      socket.disconnect();
      return;
    }

    console.log('made socket connection', socket.id);

    // Handle connection errors
    socket.on('error', (error) => {
      console.error('Socket error for', socket.id, ':', error);
      logSecurityEvent('SOCKET_ERROR', { socketId: socket.id, error: error.message }, 'medium');
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log('socket disconnected', socket.id, 'reason:', reason);
      
      // Clean up rate limiting
      socketRateLimits.delete(socket.id);
      
      const player = players.get(socket.id);
      if (player) {
        console.log('Player disconnected:', player.userName, 'from game:', player.gameId);
        
        const game = games.get(player.gameId);
        if (game) {
          // Remove player from game
          const playerIndex = game.players.indexOf(player.userName);
          if (playerIndex !== -1) {
            game.players.splice(playerIndex, 1);
            console.log('Removed player from game. Remaining players:', game.players);
            
            // If no players left, remove game
            if (game.players.length === 0) {
              console.log('No players left, removing game:', game.id);
              games.delete(game.id);
              // Remove game creator tracking
              if (game.createdBy === player.userName) {
                gameCreators.delete(player.userName);
              }
              io.emit('game removed', game.id);
            } else {
              // Update game status and notify remaining players
              // Always reset to waiting state when a player leaves
              game.status = 'waiting';
              game.board = Array(9).fill(null);
              game.currentPlayer = 'X';
              game.winner = null;
              console.log('Game reset to waiting state due to player disconnect');
              
              // Notify remaining players about the disconnect
              io.emit('player left game', game.id, player.userName, game);
              io.emit('game updated', game);
              
              console.log('Game updated after player disconnect:', game);
            }
          }
        }
        players.delete(socket.id);
      }
    });

    // Handle explicit leave game event
    socket.on('leave game', (gameId, userName) => {
      try {
        console.log('Player leaving game:', userName, 'from game:', gameId);
        
        const game = games.get(gameId);
        if (game) {
          const playerIndex = game.players.indexOf(userName);
          if (playerIndex !== -1) {
            game.players.splice(playerIndex, 1);
            console.log('Player left game. Remaining players:', game.players);
            
            // If no players left, remove game
            if (game.players.length === 0) {
              console.log('No players left, removing game:', game.id);
              games.delete(game.id);
              // Remove game creator tracking
              if (game.createdBy === userName) {
                gameCreators.delete(userName);
              }
              io.emit('game removed', game.id);
            } else {
              // Update game status and notify remaining players
              // Always reset to waiting state when a player leaves
              game.status = 'waiting';
              game.board = Array(9).fill(null);
              game.currentPlayer = 'X';
              game.winner = null;
              console.log('Game reset to waiting state due to player leaving');
              
              // Notify remaining players about the leave
              io.emit('player left game', game.id, userName, game);
              io.emit('game updated', game);
              
              console.log('Game updated after player left:', game);
            }
          }
        }
      } catch (error) {
        console.error('Error handling leave game:', error);
        logSecurityEvent('LEAVE_GAME_ERROR', { socketId: socket.id, error: error.message }, 'low');
      }
    });

    // Send chat history to new users (async)
    getLobbyMessages(MAX_CHAT_MESSAGES).then(messages => {
      socket.emit('chat history', messages);
    }).catch(error => {
      console.error('Error loading chat history:', error);
      socket.emit('chat history', []);
    });

    // Handle chat event with security
    socket.on('chat room', async function(data) {
      try {
        // Rate limiting
        if (!checkSocketRateLimit(socket.id)) {
          logSecurityEvent('SOCKET_RATE_LIMIT_EXCEEDED', { socketId: socket.id }, 'medium');
          socket.emit('error', { message: 'Rate limit exceeded' });
          return;
        }

        // Validate data
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid chat data');
        }

        if (data.text) {
          data.text = validateMessage(data.text);
        }

        if (data.userName) {
          data.userName = validateUsername(data.userName);
        }

        // Save message to database
        const savedMessage = await saveLobbyMessage(data.text, data.userName || 'Anonymous');
        
        if (!savedMessage) {
          throw new Error('Failed to save message to database');
        }

        // Create message object with database ID and timestamp
        const message = {
          id: savedMessage.id,
          text: data.text,
          userName: data.userName || 'Anonymous',
          timestamp: savedMessage.timestamp
        };

        console.log('Lobby chat message saved:', message);
        io.sockets.emit('new message', message);
      } catch (error) {
        logSecurityEvent('INVALID_CHAT_DATA', { socketId: socket.id, error: error.message }, 'low');
        socket.emit('error', { message: 'Invalid chat data' });
      }
    });

    // Handle game chat event with security
    socket.on('game chat', async function(data) {
      try {
        // Rate limiting
        if (!checkSocketRateLimit(socket.id)) {
          logSecurityEvent('SOCKET_RATE_LIMIT_EXCEEDED', { socketId: socket.id }, 'medium');
          socket.emit('error', { message: 'Rate limit exceeded' });
          return;
        }

        // Validate data
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid game chat data');
        }

        if (!data.gameId || !data.text || !data.userName) {
          throw new Error('Missing required game chat data');
        }

        // Validate game exists and user is in the game
        const game = games.get(data.gameId);
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        if (!game.players.includes(data.userName)) {
          socket.emit('error', { message: 'You are not a player in this game' });
          return;
        }

        // Validate and sanitize message
        const validatedText = validateMessage(data.text);
        const validatedUserName = validateUsername(data.userName);

        // Save message to database
        const savedMessage = await saveGameMessage(data.gameId, validatedText, validatedUserName);
        
        if (!savedMessage) {
          throw new Error('Failed to save game message to database');
        }

        // Create message object with database ID and timestamp
        const message = {
          id: savedMessage.id,
          text: validatedText,
          userName: validatedUserName,
          gameId: data.gameId,
          timestamp: savedMessage.timestamp
        };

        console.log('Game chat message saved:', message);
        
        // Broadcast to all players in the game
        io.sockets.emit('game chat message', message);

      } catch (error) {
        logSecurityEvent('INVALID_GAME_CHAT_DATA', { socketId: socket.id, error: error.message }, 'low');
        socket.emit('error', { message: 'Invalid game chat data' });
      }
    });

    // Handle request for game chat history
    socket.on('get game chat history', async function(gameId) {
      try {
        // Validate game exists
        const game = games.get(gameId);
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        // Get game chat history from database
        const gameChat = await getGameMessages(gameId, MAX_GAME_CHAT_MESSAGES);
        socket.emit('game chat history', gameChat);

      } catch (error) {
        logSecurityEvent('GAME_CHAT_HISTORY_ERROR', { socketId: socket.id, error: error.message }, 'low');
        socket.emit('error', { message: 'Failed to get game chat history' });
        socket.emit('game chat history', []);
      }
    });

    // Handle game board events with security
    socket.on('game board', function(data) {
      try {
        // Rate limiting
        if (!checkSocketRateLimit(socket.id)) {
          logSecurityEvent('SOCKET_RATE_LIMIT_EXCEEDED', { socketId: socket.id }, 'medium');
          socket.emit('error', { message: 'Rate limit exceeded' });
          return;
        }

        // Validate board data
        if (!Array.isArray(data) || data.length !== 3) {
          throw new Error('Invalid board data');
        }

        console.log('game board fires', data);
        io.sockets.emit('game board', data);
      } catch (error) {
        logSecurityEvent('INVALID_BOARD_DATA', { socketId: socket.id, error: error.message }, 'low');
        socket.emit('error', { message: 'Invalid board data' });
      }
    });

    socket.on('reset board', () => {
      try {
        // Rate limiting
        if (!checkSocketRateLimit(socket.id)) {
          logSecurityEvent('SOCKET_RATE_LIMIT_EXCEEDED', { socketId: socket.id }, 'medium');
          socket.emit('error', { message: 'Rate limit exceeded' });
          return;
        }

        console.log('reset board fires');
        io.sockets.emit('reset board');
      } catch (error) {
        logSecurityEvent('RESET_BOARD_ERROR', { socketId: socket.id, error: error.message }, 'low');
        socket.emit('error', { message: 'Reset board failed' });
      }
    });

    socket.on('reset game', (gameId) => {
      try {
        // Rate limiting
        if (!checkSocketRateLimit(socket.id)) {
          logSecurityEvent('SOCKET_RATE_LIMIT_EXCEEDED', { socketId: socket.id }, 'medium');
          socket.emit('error', { message: 'Rate limit exceeded' });
          return;
        }

        // Validate inputs
        const validatedGameId = validateGameId(gameId);
        
        console.log('Resetting game:', validatedGameId);
        const game = games.get(validatedGameId);
        
        if (game) {
          // Reset game state
          game.board = Array(9).fill(null);
          game.currentPlayer = 'X';
          game.winner = null;
          game.status = 'playing';
          
          // Broadcast reset to all clients
          io.emit('game reset', validatedGameId);
          console.log('Game reset successfully:', validatedGameId);
        } else {
          console.log('Game not found for reset:', validatedGameId);
          socket.emit('error', { message: 'Game not found' });
        }
      } catch (error) {
        logSecurityEvent('RESET_GAME_ERROR', { socketId: socket.id, error: error.message }, 'low');
        socket.emit('error', { message: 'Failed to reset game' });
      }
    });

    socket.on('console', function(data) {
      try {
        // Rate limiting
        if (!checkSocketRateLimit(socket.id)) {
          logSecurityEvent('SOCKET_RATE_LIMIT_EXCEEDED', { socketId: socket.id }, 'medium');
          socket.emit('error', { message: 'Rate limit exceeded' });
          return;
        }

        // Validate console data
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid console data');
        }

        console.log('console fires', data);
        io.sockets.emit('console', data);
      } catch (error) {
        logSecurityEvent('INVALID_CONSOLE_DATA', { socketId: socket.id, error: error.message }, 'low');
        socket.emit('error', { message: 'Invalid console data' });
      }
    });

    // Handle create game event with security
    socket.on('create game', (data) => {
      try {
        // Rate limiting for socket events
        if (!checkSocketRateLimit(socket.id)) {
          logSecurityEvent('SOCKET_RATE_LIMIT_EXCEEDED', { socketId: socket.id }, 'medium');
          socket.emit('error', { message: 'Rate limit exceeded. Please wait before creating another game.' });
          return;
        }

        // Validate game data
        if (!data || !data.name || !data.createdBy) {
          logSecurityEvent('INVALID_GAME_DATA', { socketId: socket.id, data }, 'low');
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
          currentPlayer: 'X',
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
          console.log('Game started:', gameId);
          logSecurityEvent('GAME_STARTED', { gameId, players: game.players }, 'low');
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


  });

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

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}); 