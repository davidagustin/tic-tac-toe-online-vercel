import { NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';

export async function GET() {
  try {
    if (!pusherServer) {
      return NextResponse.json({ error: 'Pusher not configured' }, { status: 500 });
    }

    const config = {
      key: process.env.NEXT_PUBLIC_PUSHER_KEY,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      forceTLS: true,
    };

    return NextResponse.json(config, {
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'X-Rate-Limit-Remaining': '1000', // Indicate remaining requests
      }
    });
  } catch (error) {
    console.error('Error getting Pusher config:', error);
    return NextResponse.json({ error: 'Failed to get Pusher config' }, { status: 500 });
  }
} 