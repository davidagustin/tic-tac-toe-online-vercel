import { NextRequest, NextResponse } from 'next/server';
import { userStats } from '@/lib/trpc';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userName: string }> }
) {
  try {
    const { userName } = await params;

    if (!userName) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const stats = userStats.get(userName) || { wins: 0, losses: 0, draws: 0 };
    
    return NextResponse.json({
      username: userName,
      stats,
      totalGames: stats.wins + stats.losses + stats.draws,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
  }
} 