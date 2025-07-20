import { getGame, setGame } from '@/lib/game-storage';
import { CHANNELS, EVENTS, pusherServer } from '@/lib/pusher';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/game/join - Join a game
export async function POST(request: NextRequest) {
  try {
    const { gameId, userName } = await request.json();

    if (!gameId || !userName) {
      return NextResponse.json({ error: 'GameId and userName are required' }, { status: 400 });
    }

    console.log('🎮 Join API: Attempting to join game:', { gameId, userName });

    const game = await getGame(gameId);
    if (!game) {
      console.log('❌ Join API: Game not found:', gameId);
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    console.log('🎮 Join API: Found game:', JSON.stringify(game, null, 2));

    if (game.players.length >= 2) {
      console.log('❌ Join API: Game is full');
      return NextResponse.json({ error: 'Game is full' }, { status: 400 });
    }

    if (game.players.includes(userName)) {
      console.log('❌ Join API: Player already in game');
      return NextResponse.json({ error: 'Already in game' }, { status: 400 });
    }

    console.log('🎮 Join API: Adding player to game:', userName);
    game.players.push(userName);
    console.log('🎮 Join API: Game players after adding:', game.players);

    // If game is now full, start it
    if (game.players.length === 2) {
      console.log('🎮 Join API: Game is full, starting game...');
      game.status = 'playing';
      // Set currentPlayer to 'X' or 'O' (not username)
      game.currentPlayer = Math.random() < 0.5 ? 'X' : 'O';
      console.log('🎮 Join API: Game started with current player:', game.currentPlayer);
      console.log('🎮 Join API: Game players:', game.players);
    }

    // Update the game in storage
    console.log('🎮 Join API: Updating game in storage:', JSON.stringify(game, null, 2));
    await setGame(gameId, game);

    // Trigger Pusher events
    if (pusherServer) {
      console.log('🎮 Join API: Triggering Pusher events...');
      await pusherServer.trigger(CHANNELS.LOBBY, EVENTS.GAME_UPDATED, { game });
      await pusherServer.trigger(CHANNELS.GAME(gameId), EVENTS.PLAYER_JOINED, {
        player: userName,
        game
      });
      console.log('✅ Join API: Pusher events triggered successfully');
    } else {
      console.error('❌ Join API: Pusher server not available');
    }

    console.log('✅ Join API: Successfully joined game');
    return NextResponse.json({ game });
  } catch (error) {
    console.error('❌ Join API: Error joining game:', error);
    return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
  }
} 