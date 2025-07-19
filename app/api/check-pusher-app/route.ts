import { NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';

export async function GET() {
  try {
    // Try to get app info by making a simple request
    if (!pusherServer) {
      throw new Error('Pusher server not configured');
    }
    const result = await pusherServer.trigger('test-channel', 'test-event', {
      message: 'App status check',
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Pusher app is active and configured',
      appInfo: {
        appId: process.env.PUSHER_APP_ID,
        key: process.env.NEXT_PUBLIC_PUSHER_KEY ? `${process.env.NEXT_PUBLIC_PUSHER_KEY.substring(0, 8)}...` : 'Not set',
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
        result,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Pusher app check failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      appInfo: {
        appId: process.env.PUSHER_APP_ID,
        key: process.env.NEXT_PUBLIC_PUSHER_KEY ? `${process.env.NEXT_PUBLIC_PUSHER_KEY.substring(0, 8)}...` : 'Not set',
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      },
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
} 