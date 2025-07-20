import { NextResponse } from 'next/server';

// Environment detection
const getEnvironment = () => {
  // Check for custom environment variable first
  if (process.env.APP_ENV) {
    return process.env.APP_ENV;
  }
  return process.env.NODE_ENV || 'development';
};

// Get environment-specific Pusher configuration
const getPusherConfig = () => {
  const env = getEnvironment();
  
  // Environment-specific variable names
  const config: Record<string, {
    PUSHER_APP_ID: string | undefined;
    PUSHER_KEY: string | undefined;
    PUSHER_SECRET: string | undefined;
    PUSHER_CLUSTER: string | undefined;
  }> = {
    development: {
      PUSHER_APP_ID: process.env.PUSHER_APP_ID_DEV || process.env.PUSHER_APP_ID,
      PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY_DEV || process.env.NEXT_PUBLIC_PUSHER_KEY,
      PUSHER_SECRET: process.env.PUSHER_SECRET_DEV || process.env.PUSHER_SECRET,
      PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER_DEV || process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    },
    staging: {
      PUSHER_APP_ID: process.env.PUSHER_APP_ID_STAGING || process.env.PUSHER_APP_ID,
      PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY_STAGING || process.env.NEXT_PUBLIC_PUSHER_KEY,
      PUSHER_SECRET: process.env.PUSHER_SECRET_STAGING || process.env.PUSHER_SECRET,
      PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER_STAGING || process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    },
    production: {
      PUSHER_APP_ID: process.env.PUSHER_APP_ID_PROD || process.env.PUSHER_APP_ID,
      PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY_PROD || process.env.NEXT_PUBLIC_PUSHER_KEY,
      PUSHER_SECRET: process.env.PUSHER_SECRET_PROD || process.env.PUSHER_SECRET,
      PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER_PROD || process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    },
  };

  return config[env] || config.development;
};

export async function GET() {
  const currentEnv = getEnvironment();
  const pusherConfig = getPusherConfig();
  
  return NextResponse.json({
    environment: currentEnv,
    key: pusherConfig.PUSHER_KEY,
    cluster: pusherConfig.PUSHER_CLUSTER,
    timestamp: new Date().toISOString(),
  });
} 