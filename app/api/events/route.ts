import { NextRequest, NextResponse } from 'next/server';
import { broadcastEvent, getEvents, addClient, removeClient } from '@/lib/events';

// GET /api/events - SSE endpoint
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get('channel') || 'default';
  const lastEventId = searchParams.get('lastEventId');

  // Set up SSE headers
  const response = new Response(
    new ReadableStream({
      start(controller) {
        const clientId = Date.now().toString();
        const client = { id: clientId, controller: new AbortController() };
        addClient(client);

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

        // Keep connection alive with heartbeat
        const heartbeat = setInterval(() => {
          try {
            const heartbeatMessage = {
              id: Date.now().toString(),
              event: 'heartbeat',
              data: { timestamp: Date.now() },
              timestamp: Date.now()
            };
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(heartbeatMessage)}\n\n`));
          } catch {
            clearInterval(heartbeat);
            removeClient(client);
          }
        }, 30000); // 30 second heartbeat

        // Clean up on disconnect
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeat);
          removeClient(client);
        });
      }
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    }
  );

  return response;
}

// POST /api/events - Send event
export async function POST(request: NextRequest) {
  try {
    const { channel, event, data } = await request.json();
    
    if (!channel || !event) {
      return NextResponse.json({ error: 'Channel and event are required' }, { status: 400 });
    }

    broadcastEvent(channel, event, data);
    
    return NextResponse.json({ success: true, message: 'Event broadcasted' });
  } catch (error) {
    console.error('Error in events API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 