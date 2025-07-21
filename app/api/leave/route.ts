import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('🚪 Leave API: Request received');
  
  try {
    const body = await request.json();
    const { gameId, userName } = body;
    
    console.log('🚪 Leave API: Request body:', { gameId, userName });

    if (!gameId || !userName) {
      return NextResponse.json({ 
        error: 'Game ID and user name are required' 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Left game successfully',
    });
    
  } catch (error) {
    console.error('Game leave error:', error);
    return NextResponse.json({ 
      error: 'Failed to leave game' 
    }, { status: 500 });
  }
} 