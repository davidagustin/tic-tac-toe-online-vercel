import { NextRequest, NextResponse } from 'next/server';
import { pusherServer, CHANNELS, EVENTS } from '@/lib/pusher';
import { saveLobbyMessage, getLobbyMessages } from '@/lib/db';

// GET /api/chat - Get chat messages
export async function GET() {
  try {
    const messages = await getLobbyMessages(100);
    return NextResponse.json(messages);
  } catch (error) {
    console.warn('Database not available, returning empty messages:', error);
    return NextResponse.json([]);
  }
}

// POST /api/chat - Send a chat message
export async function POST(request: NextRequest) {
  try {
    const { text, userName } = await request.json();
    
    if (!text || !userName) {
      return NextResponse.json({ error: 'Text and userName are required' }, { status: 400 });
    }

    // Try to save message to database (optional)
    let savedMessage: { id: string; timestamp: string } | null = null;
    try {
      savedMessage = await saveLobbyMessage(text, userName) as { id: string; timestamp: string } | null;
    } catch (dbError) {
      console.warn('Database not available, continuing without persistence:', dbError);
    }
    
    // Create message object with or without database ID
    const message = {
      id: savedMessage?.id || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      user_name: userName,
      timestamp: savedMessage?.timestamp || new Date().toISOString()
    };

    // Trigger Pusher event for real-time messaging
    if (pusherServer) {
      try {
        await pusherServer.trigger(CHANNELS.LOBBY, EVENTS.CHAT_MESSAGE, { message });
        console.log('Pusher event triggered successfully for chat message');
      } catch (pusherError) {
        console.error('Failed to trigger Pusher event:', pusherError);
        // Continue even if Pusher fails, but log the error
      }
    } else {
      console.warn('Pusher server not available');
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error('Error sending chat message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
} 