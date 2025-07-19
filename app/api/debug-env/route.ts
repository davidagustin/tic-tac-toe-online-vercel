import { NextResponse } from 'next/server';

export async function GET() {
  // Only allow in development or with a secret key
  if (process.env.NODE_ENV === 'production' && !process.env.DEBUG_SECRET) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  return NextResponse.json({
    pusher: {
      appId: process.env.PUSHER_APP_ID ? `${process.env.PUSHER_APP_ID.substring(0, 8)}...` : 'Not set',
      key: process.env.NEXT_PUBLIC_PUSHER_KEY ? `${process.env.NEXT_PUBLIC_PUSHER_KEY.substring(0, 8)}...` : 'Not set',
      secret: process.env.PUSHER_SECRET ? `${process.env.PUSHER_SECRET.substring(0, 8)}...` : 'Not set',
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'Not set',
    },
    database: {
      url: process.env.DATABASE_URL ? 'Set' : 'Not set',
    },
    nextauth: {
      secret: process.env.NEXTAUTH_SECRET ? 'Set' : 'Not set',
      url: process.env.NEXTAUTH_URL || 'Not set',
    },
    timestamp: new Date().toISOString(),
  });
} 