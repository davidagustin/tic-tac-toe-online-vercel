import { NextResponse } from 'next/server';
import { getAllGames } from '@/lib/game-storage';

// GET /api/game/list - Get all games
export async function GET() {
  try {
    const gamesList = getAllGames();
    return NextResponse.json(gamesList);
  } catch (error) {
    console.error('Error getting games:', error);
    return NextResponse.json({ error: 'Failed to get games' }, { status: 500 });
  }
} 