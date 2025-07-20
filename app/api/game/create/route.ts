import { NextRequest, NextResponse } from 'next/server';
import { games, broadcastGameEvent, type GameState } from '@/lib/trpc';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameName, userName } = body;

    if (!gameName || !userName) {
      return NextResponse.json({ error: 'Game name and user name are required' }, { status: 400 });
    }

    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const game: GameState = {
      id: gameId,
      name: gameName,
      board: ['', '', '', '', '', '', '', '', ''],
      currentPlayer: userName,
      players: [userName],
      status: 'waiting',
      createdAt: new Date(),
    };

    games.set(gameId, game);

    // Broadcast game created event
    broadcastGameEvent(gameId, {
      type: 'gameCreated',
      gameId,
      data: {
        game: {
          id: game.id,
          name: game.name,
          board: game.board,
          currentPlayer: game.currentPlayer,
          players: game.players,
          status: game.status,
          createdAt: game.createdAt,
        },
        creator: userName,
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
        createdAt: game.createdAt,
      },
    });
  } catch (error) {
    console.error('Game create error:', error);
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }
} 