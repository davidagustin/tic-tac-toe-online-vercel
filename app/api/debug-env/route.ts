import { NextResponse } from 'next/server';

export async function GET() {
  const envVars = {
    NEXT_PUBLIC_PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY ? 'present' : 'missing',
    NEXT_PUBLIC_PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ? 'present' : 'missing',
    PUSHER_APP_ID: process.env.PUSHER_APP_ID ? 'present' : 'missing',
    PUSHER_SECRET: process.env.PUSHER_SECRET ? 'present' : 'missing',
    NODE_ENV: process.env.NODE_ENV
  };

  return NextResponse.json(envVars);
} 