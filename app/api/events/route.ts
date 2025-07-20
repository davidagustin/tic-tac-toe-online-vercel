import { addClient, broadcastEvent, getEvents, removeClient } from '@/lib/events';
import { NextRequest, NextResponse } from 'next/server';

// Rate limiting for SSE connections
const connectionLimitMap = new Map<string, { count: number; resetTime: number }>();
const CONNECTION_LIMIT_WINDOW = 300000; // 5 minutes
const MAX_CONNECTIONS_PER_IP = 5; // Max 5 SSE connections per IP

function checkConnectionLimit(ip: string): boolean {
  const now = Date.now();
  const clientData = connectionLimitMap.get(ip);

  if (!clientData || now > clientData.resetTime) {
    connectionLimitMap.set(ip, { count: 1, resetTime: now + CONNECTION_LIMIT_WINDOW });
    return true;
  }

  if (clientData.count >= MAX_CONNECTIONS_PER_IP) {
    return false;
  }

  clientData.count++;
  return true;
}

function releaseConnection(ip: string) {
  const clientData = connectionLimitMap.get(ip);
  if (clientData && clientData.count > 0) {
    clientData.count--;
  }
}

// GET /api/events - SSE endpoint
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get('channel') || 'default';
  const lastEventId = searchParams.get('lastEventId');

  // Get client IP for rate limiting
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

  // Apply connection limiting
  if (!checkConnectionLimit(ip)) {
    console.warn(`SSE connection limit exceeded for IP: ${ip}`);
    return NextResponse.json(
      { error: 'Too many connections. Please try again later.' },
      { status: 429 }
    );
  }

  // Set up SSE headers with optimizations
  const response = new Response(
    new ReadableStream({
      start(controller) {
        const clientId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const client = {
          id: clientId,
          controller: new AbortController(),
          ip: ip,
          lastSeen: Date.now()
        };
        addClient(client);

        console.log(`SSE client connected: ${clientId} from ${ip}`);

        // Send initial connection message
        const connectMessage = {
          id: Date.now().toString(),
          event: 'connected',
          data: { clientId, channel },
          timestamp: Date.now()
        };
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(connectMessage)}\n\n`));

        // Send missed events if lastEventId is provided
        if (lastEventId) {
          const missedEvents = getEvents(channel, lastEventId);
          missedEvents.forEach(event => {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`));
          });
        }

        // Keep connection alive with reduced heartbeat frequency
        const heartbeat = setInterval(() => {
          try {
            // Update last seen time
            client.lastSeen = Date.now();

            const heartbeatMessage = {
              id: Date.now().toString(),
              event: 'heartbeat',
              data: { timestamp: Date.now() },
              timestamp: Date.now()
            };
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(heartbeatMessage)}\n\n`));
          } catch (error) {
            console.log(`Heartbeat failed for client ${clientId}, cleaning up`);
            clearInterval(heartbeat);
            removeClient(client);
            releaseConnection(ip);
          }
        }, 60000); // Increased from 30 to 60 seconds

        // Clean up on disconnect
        request.signal.addEventListener('abort', () => {
          console.log(`SSE client disconnected: ${clientId}`);
          clearInterval(heartbeat);
          removeClient(client);
          releaseConnection(ip);
        });

        // Auto-cleanup stale connections
        const staleCheck = setInterval(() => {
          const now = Date.now();
          if (now - client.lastSeen > 300000) { // 5 minutes
            console.log(`Auto-cleanup stale client: ${clientId}`);
            clearInterval(heartbeat);
            clearInterval(staleCheck);
            removeClient(client);
            releaseConnection(ip);
            try {
              controller.close();
            } catch (error) {
              // Ignore close errors
            }
          }
        }, 120000); // Check every 2 minutes

        // Clean up stale check on disconnect
        request.signal.addEventListener('abort', () => {
          clearInterval(staleCheck);
        });
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
        'X-Connection-Limit': MAX_CONNECTIONS_PER_IP.toString(),
      },
    }
  );

  return response;
}

// POST /api/events - Send event
export async function POST(request: NextRequest) {
  try {
    const { channel, event, data } = await request.json();

    if (!channel || !event || !data) {
      return NextResponse.json(
        { error: 'Channel, event, and data are required' },
        { status: 400 }
      );
    }

    // Broadcast event with rate limiting
    broadcastEvent(channel, event, data);

    return NextResponse.json({
      success: true,
      message: 'Event broadcasted',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error broadcasting event:', error);
    return NextResponse.json(
      { error: 'Failed to broadcast event' },
      { status: 500 }
    );
  }
} 