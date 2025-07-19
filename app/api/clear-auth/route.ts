import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, action } = body;

    if (action === 'signout' && username) {
      // In a real implementation, you would:
      // 1. Find all games created by this user
      // 2. Find all games where this user is a player
      // 3. Clean up those games
      // 4. Notify other players about the cleanup
      
      console.log(`User ${username} signed out - games should be cleaned up`);
      
      // For now, we'll just log the sign out
      // The actual cleanup will happen when the socket disconnects
    }

    return NextResponse.json({ 
      message: 'Auth cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in clear-auth:', error);
    return NextResponse.json({ 
      error: 'Failed to clear auth',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Auth clear endpoint is working',
    timestamp: new Date().toISOString()
  });
} 