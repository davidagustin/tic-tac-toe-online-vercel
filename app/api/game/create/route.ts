import { NextRequest, NextResponse } from 'next/server';
import { pusherServer, CHANNELS, EVENTS } from '@/lib/pusher';

// In-memory storage for games (in production, you'd use a database)
const games = new Map();

// POST /api/game/create - Create a new game
export async function POST(request: NextRequest) {
  try {
    const { gameName, userName } = await request.json();
    
    if (!gameName || !userName) {
      return NextResponse.json({ error: 'Game name and userName are required' }, { status: 400 });
    }

    const gameId = Date.now().toString();
    const newGame = {
      id: gameId,
      name: gameName,
      players: [userName],
      status: 'waiting' as const,
      createdBy: userName,
      createdAt: new Date(),
      board: Array(9).fill(null),
      currentPlayer: null,
      winner: null
    };

    games.set(gameId, newGame);
    // Allow users to create multiple games - don't restrict to one game per user

    // Trigger Pusher event
    try {
      if (pusherServer) {
        await pusherServer.trigger(CHANNELS.LOBBY, EVENTS.GAME_CREATED, { game: newGame });
      }
    } catch (pusherError) {
      console.error('Pusher trigger failed:', pusherError);
      // Continue without Pusher - the game is still created
    }

    return NextResponse.json({ game: newGame });
  } catch (error) {
    console.error('Error creating game:', error);
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }
} 