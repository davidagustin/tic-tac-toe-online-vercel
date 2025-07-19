import { NextRequest, NextResponse } from 'next/server';
import { pusherServer, CHANNELS, EVENTS } from '@/lib/pusher';
import { 
  saveLobbyMessage, 
  getLobbyMessages, 
  saveGameMessage, 
  getGameMessages,
  updateGameStatistics,
  getUserStatistics
} from '@/lib/db';

// In-memory storage for games (in production, you'd use a database)
const games = new Map();
const gameCreators = new Map();

// Helper function to check for winner
function checkWinner(board: (string | null)[]) {
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

// GET /api/games - Get all games
export async function GET() {
  try {
    const gamesList = Array.from(games.values());
    return NextResponse.json(gamesList);
  } catch (error) {
    console.error('Error getting games:', error);
    return NextResponse.json({ error: 'Failed to get games' }, { status: 500 });
  }
}

// POST /api/games - Create a new game
export async function POST(request: NextRequest) {
  try {
    const { name, createdBy } = await request.json();
    
    if (!name || !createdBy) {
      return NextResponse.json({ error: 'Name and createdBy are required' }, { status: 400 });
    }

    const gameId = Date.now().toString();
    const newGame = {
      id: gameId,
      name,
      players: [createdBy],
      status: 'waiting' as const,
      createdBy,
      createdAt: new Date(),
      board: Array(9).fill(null),
      currentPlayer: null,
      winner: null
    };

    games.set(gameId, newGame);
    gameCreators.set(createdBy, gameId);

    // Trigger Pusher event
    await pusherServer.trigger(CHANNELS.LOBBY, EVENTS.GAME_CREATED, { game: newGame });

    return NextResponse.json(newGame);
  } catch (error) {
    console.error('Error creating game:', error);
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }
}

// PUT /api/games/[id]/join - Join a game
export async function PUT(request: NextRequest) {
  try {
    const { gameId, userName } = await request.json();
    
    if (!gameId || !userName) {
      return NextResponse.json({ error: 'GameId and userName are required' }, { status: 400 });
    }

    const game = games.get(gameId);
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.players.length >= 2) {
      return NextResponse.json({ error: 'Game is full' }, { status: 400 });
    }

    if (game.players.includes(userName)) {
      return NextResponse.json({ error: 'Already in game' }, { status: 400 });
    }

    game.players.push(userName);

    // If game is now full, start it
    if (game.players.length === 2) {
      game.status = 'playing';
      game.currentPlayer = Math.random() < 0.5 ? 'X' : 'O';
    }

    // Trigger Pusher events
    await pusherServer.trigger(CHANNELS.LOBBY, EVENTS.GAME_UPDATED, { game });
    await pusherServer.trigger(CHANNELS.GAME(gameId), EVENTS.PLAYER_JOINED, { 
      player: userName, 
      game 
    });

    return NextResponse.json(game);
  } catch (error) {
    console.error('Error joining game:', error);
    return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
  }
} 