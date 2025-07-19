import { NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';

export async function GET() {
  try {
    // Test Pusher server connection by triggering a test event
    if (!pusherServer) {
      throw new Error('Pusher server not configured');
    }
    const result = await pusherServer.trigger('test-channel', 'test-event', {
      message: 'Test message',
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Pusher server connection successful',
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Pusher server connection test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
} 