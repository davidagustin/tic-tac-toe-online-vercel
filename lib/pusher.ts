import PusherServer from 'pusher';
import PusherClient from 'pusher-js';

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

// Environment validation (server-side only)
const validateEnvironment = () => {
  // Only validate on server-side
  if (typeof window !== 'undefined') {
    return {
      PUSHER_APP_ID: undefined,
      PUSHER_KEY: undefined,
      PUSHER_SECRET: undefined,
      PUSHER_CLUSTER: undefined,
    };
  }

  // Get environment-specific config
  const pusherConfig = getPusherConfig();

  // Safe environment variable access
  const required = {
    PUSHER_APP_ID: pusherConfig.PUSHER_APP_ID || undefined,
    PUSHER_KEY: pusherConfig.PUSHER_KEY || undefined,
    PUSHER_SECRET: pusherConfig.PUSHER_SECRET || undefined,
    PUSHER_CLUSTER: pusherConfig.PUSHER_CLUSTER || undefined,
  };

  // Always return the values, don't throw errors
  return required;
};

// Get validated environment variables (server-side only)
const env = typeof window === 'undefined' ? validateEnvironment() : {
  PUSHER_APP_ID: undefined,
  PUSHER_KEY: undefined,
  PUSHER_SECRET: undefined,
  PUSHER_CLUSTER: undefined,
};

// Server-side Pusher instance with best practices (server-side only)
const createPusherServer = () => {
  if (typeof window !== 'undefined') {
    throw new Error('PusherServer can only be created on the server-side');
  }
  
  const serverEnv = validateEnvironment();
  const currentEnv = getEnvironment();
  
  // Validate required environment variables
  if (!serverEnv.PUSHER_APP_ID) {
    console.error(`PUSHER_APP_ID is not set for ${currentEnv} environment`);
    return null;
  }
  
  if (!serverEnv.PUSHER_KEY) {
    console.error(`PUSHER_KEY is not set for ${currentEnv} environment`);
    return null;
  }
  
  if (!serverEnv.PUSHER_SECRET) {
    console.error(`PUSHER_SECRET is not set for ${currentEnv} environment`);
    return null;
  }
  
  if (!serverEnv.PUSHER_CLUSTER) {
    console.error(`PUSHER_CLUSTER is not set for ${currentEnv} environment`);
    return null;
  }
  
  console.log(`Creating Pusher server for ${currentEnv} environment with config:`, {
    environment: currentEnv,
    appId: serverEnv.PUSHER_APP_ID ? 'Set' : 'Not set',
    key: serverEnv.PUSHER_KEY ? `${serverEnv.PUSHER_KEY.substring(0, 8)}...` : 'Not set',
    cluster: serverEnv.PUSHER_CLUSTER,
    secret: serverEnv.PUSHER_SECRET ? `${serverEnv.PUSHER_SECRET.substring(0, 8)}...` : 'Not set',
  });
  
  try {
    // Use the exact same configuration as the working example
    return new PusherServer({
      appId: serverEnv.PUSHER_APP_ID!,
      key: serverEnv.PUSHER_KEY!,
      secret: serverEnv.PUSHER_SECRET!,
      cluster: serverEnv.PUSHER_CLUSTER!,
      useTLS: true,
    });
  } catch (error) {
    console.error('Failed to create Pusher server:', error);
    return null;
  }
};

export const pusherServer = typeof window === 'undefined' ? createPusherServer() : null;

// Client-side Pusher instance - will be initialized with config from server
let pusherClient: PusherClient | null = null;

// Enhanced Pusher client configuration
const getPusherClientConfig = (key: string, cluster: string) => ({
  cluster,
  forceTLS: true,
  // Performance settings
  disableStats: true, // Disable stats collection for better performance
  // Additional settings for better compatibility
  wsHost: `ws-${cluster}.pusherapp.com`,
  wsPort: 443,
  wssPort: 443,
});

// Function to initialize Pusher client with config from server
export async function initializePusherClient(): Promise<PusherClient> {
  if (pusherClient) {
    return pusherClient;
  }

  try {
    // Fetch config from server with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`/api/pusher-config?v=${Date.now()}&t=${Date.now()}`, {
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch Pusher config: ${response.status}`);
    }

    const config = await response.json();
    
    console.log('Fetched Pusher config from server:', {
      environment: config.environment,
      key: config.key ? `${config.key.substring(0, 8)}...` : 'Not set',
      cluster: config.cluster,
      keyLength: config.key?.length || 0,
      fullKey: config.key, // Temporary for debugging
    });
    
    if (!config.key || !config.cluster) {
      throw new Error('Pusher configuration not available');
    }

    const clientConfig = getPusherClientConfig(config.key, config.cluster);
    
    pusherClient = new PusherClient(config.key, clientConfig);

    // Set up connection event handlers with detailed logging
    pusherClient.connection.bind('connecting', () => {
      console.log('Pusher client: Connecting...');
    });

    pusherClient.connection.bind('connected', () => {
      console.log('Pusher client: Connected successfully');
    });

    pusherClient.connection.bind('disconnected', () => {
      console.log('Pusher client: Disconnected');
    });

    pusherClient.connection.bind('error', (error: any) => {
      console.error('Pusher client: Connection error:', error);
      console.error('Error details:', {
        code: error.code,
        data: error.data,
        message: error.message,
        type: error.type
      });
    });

    // Log initial connection state
    console.log('Pusher client initial state:', pusherClient.connection.state);

    console.log('Pusher client initialized with config from server:', {
      key: config.key ? `${config.key.substring(0, 8)}...` : 'Not set',
      cluster: config.cluster,
      keyLength: config.key?.length || 0,
    });

    return pusherClient;
  } catch (error) {
    console.error('Failed to initialize Pusher client:', error);
    throw error;
  }
}

// Get existing Pusher client instance
export function getPusherClient(): PusherClient | null {
  return pusherClient;
}

// Cleanup function
export function cleanupPusherClient(): void {
  if (pusherClient) {
    pusherClient.disconnect();
    pusherClient = null;
  }
}

// Export environment-specific configuration utility
export const getEnvironmentSpecificConfig = () => {
  const currentEnv = getEnvironment();
  const pusherConfig = getPusherConfig();
  
  return {
    environment: currentEnv,
    pusher: {
      appId: pusherConfig.PUSHER_APP_ID,
      key: pusherConfig.PUSHER_KEY,
      secret: pusherConfig.PUSHER_SECRET,
      cluster: pusherConfig.PUSHER_CLUSTER,
    },
    isDevelopment: currentEnv === 'development',
    isStaging: currentEnv === 'staging',
    isProduction: currentEnv === 'production',
  };
};

// Debug Pusher configuration (server-side only)
if (typeof window === 'undefined') {
  const config = getEnvironmentSpecificConfig();
  console.log('Server-side Pusher Config:', {
    environment: config.environment,
    key: config.pusher.key ? 'Set' : 'Not set',
    cluster: config.pusher.cluster,
    keyLength: config.pusher.key?.length || 0,
    appId: config.pusher.appId ? 'Set' : 'Not set',
  });
}

// Channel names with validation
export const CHANNELS = {
  LOBBY: 'lobby',
  GAME: (gameId: string) => {
    if (!gameId || typeof gameId !== 'string') {
      throw new Error('Invalid game ID for channel');
    }
    return `game-${gameId}`;
  },
  USER: (userId: string) => {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID for channel');
    }
    return `user-${userId}`;
  },
  PRIVATE: (userId: string) => {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID for private channel');
    }
    return `private-user-${userId}`;
  },
};

// Event names with validation
export const EVENTS = {
  // Game events
  GAME_CREATED: 'game-created',
  GAME_UPDATED: 'game-updated',
  GAME_JOINED: 'game-joined',
  GAME_STARTED: 'game-started',
  GAME_ENDED: 'game-ended',
  GAME_DELETED: 'game-deleted',
  
  // Player events
  PLAYER_JOINED: 'player-joined',
  PLAYER_LEFT: 'player-left',
  PLAYER_MOVED: 'player-moved',
  
  // Chat events
  CHAT_MESSAGE: 'chat-message',
  
  // Statistics events
  STATS_UPDATED: 'stats-updated',
  
  // System events
  ERROR: 'error',
  CONNECTION_STATUS: 'connection-status',
  HEARTBEAT: 'heartbeat',
};

// Type definitions for better type safety
export interface Game {
  id: string;
  name: string;
  status: 'waiting' | 'playing' | 'finished';
  players: string[];
  currentPlayer?: 'X' | 'O';
  board: string[];
  winner?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Player {
  id: string;
  name: string;
  symbol: 'X' | 'O';
  isOnline: boolean;
  lastSeen: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  userName: string;
  timestamp: string;
  gameId?: string;
}

export interface PlayerStats {
  userName: string;
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  winRate: number;
}

// Enhanced Pusher utilities
export class PusherUtils {
  // Validate channel name
  static validateChannelName(channelName: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(channelName);
  }

  // Validate event name
  static validateEventName(eventName: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(eventName);
  }

  // Sanitize data for Pusher
  static sanitizeData(data: any): any {
    if (typeof data === 'string') {
      return data.substring(0, 1000); // Limit string length
    }
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (typeof key === 'string' && key.length <= 50) {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      return sanitized;
    }
    return data;
  }

  // Trigger event with error handling and validation
  static async triggerEvent(
    channel: string,
    event: string,
    data: any
  ): Promise<void> {
    try {
      if (!this.validateChannelName(channel)) {
        throw new Error(`Invalid channel name: ${channel}`);
      }

      if (!this.validateEventName(event)) {
        throw new Error(`Invalid event name: ${event}`);
      }

      const sanitizedData = this.sanitizeData(data);

      if (!pusherServer) {
        throw new Error('PusherServer is not available (client-side)');
      }

      await pusherServer.trigger(channel, event, sanitizedData);
      
      console.log(`Pusher event triggered: ${channel}:${event}`);
    } catch (error) {
      console.error('Failed to trigger Pusher event:', {
        channel,
        event,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Subscribe to channel with error handling
  static subscribeToChannel(
    pusherClient: PusherClient,
    channelName: string,
    eventHandlers: Record<string, (data: any) => void>
  ): void {
    try {
      if (!this.validateChannelName(channelName)) {
        throw new Error(`Invalid channel name: ${channelName}`);
      }

      const channel = pusherClient.subscribe(channelName);

      // Bind event handlers
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        if (this.validateEventName(event)) {
          channel.bind(event, handler);
        }
      });

      console.log(`Subscribed to channel: ${channelName}`);
    } catch (error) {
      console.error('Failed to subscribe to channel:', {
        channelName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Unsubscribe from channel
  static unsubscribeFromChannel(
    pusherClient: PusherClient,
    channelName: string
  ): void {
    try {
      pusherClient.unsubscribe(channelName);
      console.log(`Unsubscribed from channel: ${channelName}`);
    } catch (error) {
      console.error('Failed to unsubscribe from channel:', {
        channelName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
} 