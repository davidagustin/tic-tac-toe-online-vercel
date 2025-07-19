import { NextRequest, NextResponse } from 'next/server';
import { pusherServer, CHANNELS, EVENTS } from '@/lib/pusher';
import { saveLobbyMessage, getLobbyMessages } from '@/lib/db';

// GET /api/chat - Get chat messages
export async function GET() {
  try {
    const messages = await getLobbyMessages(100);
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error getting chat messages:', error);
    return NextResponse.json({ error: 'Failed to get chat messages' }, { status: 500 });
  }
}

// POST /api/chat - Send a chat message
export async function POST(request: NextRequest) {
  try {
    const { text, userName } = await request.json();
    
    if (!text || !userName) {
      return NextResponse.json({ error: 'Text and userName are required' }, { status: 400 });
    }

    // Save message to database
    const savedMessage = await saveLobbyMessage(text, userName);
    
    if (!savedMessage) {
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }

    const message = {
      id: savedMessage.id,
      text,
      user_name: userName,
      timestamp: savedMessage.timestamp
    };

    // Trigger Pusher event
    await pusherServer.trigger(CHANNELS.LOBBY, EVENTS.CHAT_MESSAGE, { message });

    return NextResponse.json(message);
  } catch (error) {
    console.error('Error sending chat message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
} 