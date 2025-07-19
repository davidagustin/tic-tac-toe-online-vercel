import { NextRequest, NextResponse } from 'next/server';
import { pusherServer, CHANNELS, EVENTS } from '@/lib/pusher';

// In-memory storage for games (in production, you'd use a database)
const games = new Map();

// POST /api/game/join - Join a game
export async function POST(request: NextRequest) {
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
    if (pusherServer) {
      await pusherServer.trigger(CHANNELS.LOBBY, EVENTS.GAME_UPDATED, { game });
      await pusherServer.trigger(CHANNELS.GAME(gameId), EVENTS.PLAYER_JOINED, { 
        player: userName, 
        game 
      });
    }

    return NextResponse.json({ game });
  } catch (error) {
    console.error('Error joining game:', error);
    return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
  }
} 