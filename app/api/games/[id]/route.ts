import { NextRequest, NextResponse } from 'next/server';
import { getGame, games } from '@/lib/game-storage';

// GET /api/games/[id] - Get game by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🎮 Game Get API: Fetching game with ID:', params.id);
  console.log('🎮 Game Get API: Request URL:', request.url);
  
  try {
    const gameId = params.id;
    console.log('🎮 Game Get API: Looking for gameId:', gameId);
    
    // Check what games are available
    const allGames = Array.from(games.entries());
    console.log('🎮 Game Get API: Available games:', allGames.map(([id, game]: [string, any]) => ({ id, name: game.name })));
    
    const game = getGame(gameId);
    
    if (!game) {
      console.log('❌ Game Get API: Game not found with ID:', gameId);
      console.log('❌ Game Get API: Available game IDs:', allGames.map(([id]: [string, any]) => id));
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    console.log('✅ Game Get API: Found game:', JSON.stringify(game, null, 2));
    return NextResponse.json(game);
  } catch (error) {
    console.error('❌ Game Get API: Error fetching game:', error);
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 });
  }
} 