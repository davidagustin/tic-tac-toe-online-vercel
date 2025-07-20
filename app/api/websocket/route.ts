import { NextRequest, NextResponse } from 'next/server';

// WebSocket handler - simplified for Next.js compatibility
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get('channel') || 'default';
  const clientId = searchParams.get('clientId') || Date.now().toString();

  // For Next.js, we'll use a polling-based approach instead of WebSocket
  // This is more compatible and doesn't require special server setup
  return NextResponse.json({
    message: 'WebSocket endpoint - use SSE or polling instead',
    channel,
    clientId,
    timestamp: Date.now()
  });
} 