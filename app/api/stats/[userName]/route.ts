import { NextRequest, NextResponse } from 'next/server';
import { pusherServer, CHANNELS, EVENTS } from '@/lib/pusher';
import { getUserStatistics, updateGameStatistics } from '@/lib/db';

// GET /api/stats/[userName] - Get user statistics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userName: string }> }
) {
  try {
    const { userName } = await params;
    const stats = await getUserStatistics(userName);
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting user statistics:', error);
    return NextResponse.json({ error: 'Failed to get user statistics' }, { status: 500 });
  }
}

// POST /api/stats/[userName] - Update user statistics
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userName: string }> }
) {
  try {
    const { userName } = await params;
    const { result } = await request.json();
    
    if (!result || !['win', 'loss', 'draw'].includes(result)) {
      return NextResponse.json({ error: 'Valid result is required' }, { status: 400 });
    }

    // Update statistics in database
    const updatedStats = await updateGameStatistics(userName, result);
    
    if (!updatedStats) {
      return NextResponse.json({ error: 'Failed to update statistics' }, { status: 500 });
    }

    // Trigger Pusher event to notify user
    await pusherServer.trigger(CHANNELS.USER(userName), EVENTS.STATS_UPDATED, { 
      stats: updatedStats 
    });

    return NextResponse.json(updatedStats);
  } catch (error) {
    console.error('Error updating user statistics:', error);
    return NextResponse.json({ error: 'Failed to update user statistics' }, { status: 500 });
  }
} 