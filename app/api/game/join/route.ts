import { NextRequest, NextResponse } from 'next/server';
import { games, broadcastGameEvent } from '@/lib/trpc';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameId, userName } = body;

    if (!gameId || !userName) {
      return NextResponse.json({ error: 'Game ID and user name are required' }, { status: 400 });
    }

    const game = games.get(gameId);

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'waiting') {
      return NextResponse.json({ error: 'Game is not accepting players' }, { status: 400 });
    }

    if (game.players.includes(userName)) {
      return NextResponse.json({ error: 'Already in this game' }, { status: 400 });
    }

    if (game.players.length >= 2) {
      return NextResponse.json({ error: 'Game is full' }, { status: 400 });
    }

    // Add player to game
    game.players.push(userName);
    game.status = 'playing';

    // Broadcast player joined event
    broadcastGameEvent(gameId, {
      type: 'playerJoined',
      gameId,
      data: {
        player: userName,
        players: game.players,
        status: game.status,
      },
      timestamp: Date.now(),
      userId: userName,
    });

    return NextResponse.json({
      success: true,
      game: {
        id: game.id,
        name: game.name,
        board: game.board,
        currentPlayer: game.currentPlayer,
        players: game.players,
        status: game.status,
      },
    });
  } catch (error) {
    console.error('Game join error:', error);
    return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
  }
} 