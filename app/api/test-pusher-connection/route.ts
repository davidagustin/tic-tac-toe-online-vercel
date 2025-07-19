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
    
    // First, try to get app info to validate credentials
    try {
      const appInfo = await pusherServer.get({ path: '/apps/me' });
      console.log('Pusher app info retrieved successfully:', appInfo);
    } catch (appInfoError) {
      console.error('Failed to get Pusher app info:', appInfoError);
      return NextResponse.json({
        success: false,
        error: 'Invalid Pusher credentials',
        details: appInfoError instanceof Error ? appInfoError.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }
    
    // Then try to trigger a test event
    const result = await pusherServer.trigger('test-channel', 'test-event', {
      message: 'Test message',
      timestamp: new Date().toISOString()
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