import { NextRequest, NextResponse } from 'next/server';
import { pusherServer, CHANNELS, EVENTS } from '@/lib/pusher';
import { getUserStatistics, updateGameStatistics, query } from '@/lib/db';

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

    // Get user ID from username first
    const userResult = await query('SELECT id FROM users WHERE username = $1', [userName]);
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userId = userResult.rows[0].id;
    
    // Update statistics in database
    await updateGameStatistics(userId, result);
    
    // Get updated statistics
    const updatedStats = await getUserStatistics(userName);

    // Trigger Pusher event to notify user
    if (pusherServer) {
      await pusherServer.trigger(CHANNELS.USER(userName), EVENTS.STATS_UPDATED, { 
        stats: updatedStats 
      });
    }

    return NextResponse.json(updatedStats);
  } catch (error) {
    console.error('Error updating user statistics:', error);
    return NextResponse.json({ error: 'Failed to update user statistics' }, { status: 500 });
  }
} 