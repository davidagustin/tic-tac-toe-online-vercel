import { getAllGames } from '@/lib/game-storage';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('📋 Game List API: Getting all games...');
    const games = await getAllGames();
    console.log(`✅ Game List API: Retrieved ${games.length} games`);
    return NextResponse.json(games);
  } catch (error) {
    console.error('❌ Game List API: Error getting games:', error);
    return NextResponse.json({ error: 'Failed to get games' }, { status: 500 });
  }
} 