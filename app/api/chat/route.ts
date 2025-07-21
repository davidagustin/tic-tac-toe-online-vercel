import { NextRequest, NextResponse } from 'next/server';

// In-memory chat storage
const chatMessages: Array<{
  id: string;
  gameId: string;
  user_name: string;
  text: string;
  timestamp: string;
}> = [];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId');

  if (!gameId) {
    return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
  }

  const messages = chatMessages.filter(msg => msg.gameId === gameId);
  return NextResponse.json(messages);
}

export async function POST(request: NextRequest) {
  try {
    const { gameId, playerName, message } = await request.json();

    if (!gameId || !playerName || !message) {
      return NextResponse.json(
        { error: 'Game ID, player name, and message are required' },
        { status: 400 }
      );
    }

    const newMessage = {
      id: Date.now().toString(),
      gameId,
      user_name: playerName,
      text: message,
      timestamp: new Date().toISOString(),
    };

    chatMessages.push(newMessage);

    // Keep only last 100 messages per game to prevent memory issues
    const gameMessages = chatMessages.filter(msg => msg.gameId === gameId);
    if (gameMessages.length > 100) {
      const toRemove = gameMessages.length - 100;
      const gameMessageIds = gameMessages.slice(0, toRemove).map(msg => msg.id);
      const removeIndexes = gameMessageIds.map(id => 
        chatMessages.findIndex(msg => msg.id === id)
      ).filter(idx => idx !== -1);
      
      removeIndexes.forEach(idx => {
        chatMessages.splice(idx, 1);
      });
    }

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error('Chat POST error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
} 