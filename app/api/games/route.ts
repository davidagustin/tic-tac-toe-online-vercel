import { NextResponse } from 'next/server';
import { gameRouter } from '@/lib/routers/game';

export async function GET() {
  try {
    // Get all games from the game router
    const result = await gameRouter.createCaller({
      user: null,
      req: null,
      res: null,
    }).list();
    return NextResponse.json(result.games);
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    );
  }
} 