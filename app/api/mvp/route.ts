import { NextRequest, NextResponse } from 'next/server';
import { query, initializeDatabase } from '@/lib/db';

export async function GET() {
  try {
    // Initialize database on first request
    await initializeDatabase();
    
    const messages = await query('SELECT * FROM chatRoomText ORDER BY id DESC LIMIT 50');
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    
    // If database is not configured, return empty array
    if (error instanceof Error && error.message.includes('DATABASE_URL')) {
      return NextResponse.json([]);
    }
    
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { body: messageText, userName } = body;
    const queryParams = `${userName}: ${messageText}`;
    
    await query('INSERT INTO chatRoomText (text) VALUES ($1)', [queryParams]);
    
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error posting message:', error);
    
    // If database is not configured, return success but don't store
    if (error instanceof Error && error.message.includes('DATABASE_URL')) {
      return NextResponse.json({ success: true, message: 'Database not configured - message not stored' }, { status: 201 });
    }
    
    return NextResponse.json({ error: 'Failed to post message' }, { status: 400 });
  }
} 