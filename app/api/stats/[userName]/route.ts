import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for game statistics (shared with other routes)
// In a real app, this would be in a database
const userStats = new Map<string, { wins: number; losses: number; draws: number }>();

export async function GET(
  request: NextRequest,
  { params }: { params: { userName: string } }
) {
  try {
    const { userName } = params;

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