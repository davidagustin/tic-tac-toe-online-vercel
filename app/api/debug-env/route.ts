import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    pusherKey: process.env.NEXT_PUBLIC_PUSHER_KEY ? 'Set' : 'Not set',
    pusherCluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'Not set',
    pusherAppId: process.env.PUSHER_APP_ID ? 'Set' : 'Not set',
    pusherSecret: process.env.PUSHER_SECRET ? 'Set' : 'Not set',
    keyLength: process.env.NEXT_PUBLIC_PUSHER_KEY?.length || 0,
    clusterLength: process.env.NEXT_PUBLIC_PUSHER_CLUSTER?.length || 0,
    timestamp: new Date().toISOString(),
  });
} 