import { NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';

export async function GET() {
  try {
    // Test Pusher configuration
    const config = {
      appId: process.env.PUSHER_APP_ID ? 'Set' : 'Not set',
      key: process.env.NEXT_PUBLIC_PUSHER_KEY ? 'Set' : 'Not set',
      secret: process.env.PUSHER_SECRET ? 'Set' : 'Not set',
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
      keyLength: process.env.NEXT_PUBLIC_PUSHER_KEY?.length || 0,
    };

    // Test Pusher connection
    let connectionTest = 'Not tested';
    try {
      await pusherServer.trigger('test-channel', 'test-event', { message: 'test' });
      connectionTest = 'Success';
    } catch (error: any) {
      connectionTest = `Failed: ${error.message}`;
    }

    return NextResponse.json({
      config,
      connectionTest,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error testing Pusher:', error);
    return NextResponse.json({ 
      error: 'Failed to test Pusher',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 