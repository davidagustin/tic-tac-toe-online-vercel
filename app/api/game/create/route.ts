import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';
import { games, setGame } from '@/lib/game-storage';

// POST /api/game/create - Create a new game
export async function POST(request: NextRequest) {
  console.log('🎮 Game Creation API: Starting game creation process...');
  
  try {
    const body = await request.json();
    console.log('🎮 Game Creation API: Request body:', body);
    
    const { gameName, userName } = body;
    
    if (!gameName || !userName) {
      console.log('❌ Game Creation API: Missing required fields - gameName:', gameName, 'userName:', userName);
      return NextResponse.json({ error: 'Game name and user name are required' }, { status: 400 });
    }

    console.log('✅ Game Creation API: Valid request - gameName:', gameName, 'userName:', userName);

    const gameId = Date.now().toString();
    console.log('🎮 Game Creation API: Generated gameId:', gameId);
    
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

    console.log('🎮 Game Creation API: Created game object:', JSON.stringify(newGame, null, 2));

    setGame(gameId, newGame);
    console.log('✅ Game Creation API: Game stored in memory. Total games:', games.size);

    // Broadcast game creation to Pusher
    console.log('📡 Game Creation API: Attempting to broadcast to Pusher...');
    console.log('📡 Game Creation API: pusherServer available:', !!pusherServer);
    
    if (pusherServer) {
      console.log('📡 Game Creation API: Triggering Pusher event...');
      try {
        await pusherServer.trigger('lobby', 'game-created', { game: newGame });
        console.log('✅ Game Creation API: Pusher event triggered successfully');
      } catch (pusherError) {
        console.error('❌ Game Creation API: Pusher trigger failed:', pusherError);
      }
    } else {
      console.log('⚠️ Game Creation API: Pusher server not available');
    }

    console.log('✅ Game Creation API: Returning game response');
    return NextResponse.json({ game: newGame });
  } catch (error) {
    console.error('❌ Game Creation API: Error creating game:', error);
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }
} 