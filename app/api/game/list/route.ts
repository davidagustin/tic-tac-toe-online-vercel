import { NextResponse } from 'next/server';
import { games } from '@/lib/trpc';

export async function GET() {
  try {
    console.log('📋 Game List API: Getting all games...');
    console.log('📋 Game List API: Total games in storage:', games.size);
    console.log('📋 Game List API: All game IDs in storage:', Array.from(games.keys()));
    const gamesList = Array.from(games.values());
    console.log(`✅ Game List API: Retrieved ${gamesList.length} games`);
    return NextResponse.json(gamesList);
  } catch (error) {
    console.error('❌ Game List API: Error getting games:', error);
    return NextResponse.json({ error: 'Failed to get games' }, { status: 500 });
  }
} 