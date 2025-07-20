import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test with the exact same configuration as the working example
    const Pusher = require('pusher');
    
    const pusher = new Pusher({
      appId: "2024852",
      key: "09915e27605d8b2d1cda",
      secret: "ef9b3bdfe1431d0a6a83",
      cluster: "us3",
      useTLS: true
    });

    console.log('Testing Pusher with exact credentials from working example...');

    // Try to trigger the same event as the working example
    const result = await pusher.trigger("my-channel", "my-event", {
      message: "hello world"
    });

    console.log('Pusher test successful:', result);

    return NextResponse.json({
      success: true,
      message: 'Pusher connection successful with working credentials',
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Pusher test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
} 