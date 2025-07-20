import { NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';

export async function GET() {
  try {
    // Test Pusher server connection by triggering a test event
    if (!pusherServer) {
      console.error('Pusher server not configured - pusherServer is null');
      return NextResponse.json({
        success: false,
        error: 'Pusher server not configured',
        details: 'pusherServer is null',
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }
    
    console.log('Testing Pusher server connection...');
    
    // Try to trigger the same event as the working example
    const result = await pusherServer.trigger("my-channel", "my-event", {
      message: "hello world"
    });

    console.log('Pusher server test successful:', result);

    return NextResponse.json({
      success: true,
      message: 'Pusher server connection successful',
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Pusher server connection test failed:', error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: errorStack,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
} 