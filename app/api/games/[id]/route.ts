import { games, getGame } from '@/lib/game-storage';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/games/[id] - Get game by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  console.log('🎮 Game Get API: Fetching game with ID:', resolvedParams.id);
  console.log('🎮 Game Get API: Request URL:', request.url);

  try {
    const gameId = resolvedParams.id;
    console.log('🎮 Game Get API: Looking for gameId:', gameId);

    // Check what games are available
    const allGames = Array.from(games.entries());
    console.log('🎮 Game Get API: Available games:', allGames.map(([id, game]: [string, unknown]) => ({ id, name: (game as { name?: string })?.name })));

    const game = getGame(gameId);

    if (!game) {
      console.log('❌ Game Get API: Game not found with ID:', gameId);
      console.log('❌ Game Get API: Available game IDs:', allGames.map(([id]: [string, unknown]) => id));
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    console.log('✅ Game Get API: Found game:', JSON.stringify(game, null, 2));
    return NextResponse.json(game);
  } catch (error) {
    console.error('❌ Game Get API: Error fetching game:', error);
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 });
  }
} 