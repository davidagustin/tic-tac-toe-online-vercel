import { NextResponse } from 'next/server';
import Pusher from 'pusher';

export async function GET() {
  try {
    // Get environment-specific Pusher configuration
    const env = process.env.NODE_ENV || 'development';
    
    const pusherConfig = {
      development: {
        appId: process.env.PUSHER_APP_ID_DEV || process.env.PUSHER_APP_ID,
        key: process.env.NEXT_PUBLIC_PUSHER_KEY_DEV || process.env.NEXT_PUBLIC_PUSHER_KEY,
        secret: process.env.PUSHER_SECRET_DEV || process.env.PUSHER_SECRET,
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER_DEV || process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      },
      staging: {
        appId: process.env.PUSHER_APP_ID_STAGING || process.env.PUSHER_APP_ID,
        key: process.env.NEXT_PUBLIC_PUSHER_KEY_STAGING || process.env.NEXT_PUBLIC_PUSHER_KEY,
        secret: process.env.PUSHER_SECRET_STAGING || process.env.PUSHER_SECRET,
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER_STAGING || process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      },
      production: {
        appId: process.env.PUSHER_APP_ID_PROD || process.env.PUSHER_APP_ID,
        key: process.env.NEXT_PUBLIC_PUSHER_KEY_PROD || process.env.NEXT_PUBLIC_PUSHER_KEY,
        secret: process.env.PUSHER_SECRET_PROD || process.env.PUSHER_SECRET,
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER_PROD || process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      },
    };

    const config = pusherConfig[env as keyof typeof pusherConfig] || pusherConfig.development;

    if (!config.appId || !config.key || !config.secret || !config.cluster) {
      return NextResponse.json({
        success: false,
        error: 'Pusher configuration incomplete',
        environment: env,
        config: {
          appId: config.appId ? 'Set' : 'Not set',
          key: config.key ? 'Set' : 'Not set',
          secret: config.secret ? 'Set' : 'Not set',
          cluster: config.cluster || 'Not set',
        }
      }, { status: 500 });
    }

    const pusher = new Pusher({
      appId: config.appId,
      key: config.key,
      secret: config.secret,
      cluster: config.cluster,
      useTLS: true,
    });

    // Test triggering an event
    await pusher.trigger('test-channel', 'test-event', {
      message: 'Hello from server!',
      timestamp: new Date().toISOString(),
      environment: env,
    });

    return NextResponse.json({
      success: true,
      message: 'Pusher test event triggered successfully',
      environment: env,
      channel: 'test-channel',
      event: 'test-event',
      timestamp: new Date().toISOString(),
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
} 