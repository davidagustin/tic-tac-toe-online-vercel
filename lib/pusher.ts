import PusherServer from 'pusher';
import PusherClient from 'pusher-js';

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

  // Safe environment variable access
  const required = {
    PUSHER_APP_ID: process.env.PUSHER_APP_ID || undefined,
    PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY || undefined,
    PUSHER_SECRET: process.env.PUSHER_SECRET || undefined,
    PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || undefined,
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

// Server-side Pusher instance with simplified configuration (server-side only)
const createPusherServer = () => {
  if (typeof window !== 'undefined') {
    throw new Error('PusherServer can only be created on the server-side');
  }
  
  const serverEnv = validateEnvironment();
  
  // Validate required environment variables
  if (!serverEnv.PUSHER_APP_ID) {
    console.error('PUSHER_APP_ID is not set');
    return null;
  }
  
  if (!serverEnv.PUSHER_KEY) {
    console.error('PUSHER_KEY is not set');
    return null;
  }
  
  if (!serverEnv.PUSHER_SECRET) {
    console.error('PUSHER_SECRET is not set');
    return null;
  }
  
  if (!serverEnv.PUSHER_CLUSTER) {
    console.error('PUSHER_CLUSTER is not set');
    return null;
  }
  
  console.log('Creating Pusher server with simplified config:', {
    appId: serverEnv.PUSHER_APP_ID ? 'Set' : 'Not set',
    key: serverEnv.PUSHER_KEY ? `${serverEnv.PUSHER_KEY.substring(0, 8)}...` : 'Not set',
    cluster: serverEnv.PUSHER_CLUSTER,
    secret: serverEnv.PUSHER_SECRET ? `${serverEnv.PUSHER_SECRET.substring(0, 8)}...` : 'Not set',
  });
  
  try {
    // Simplified configuration matching Stack Overflow working example
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

// Simplified Pusher client configuration (matching Stack Overflow working example)
const getPusherClientConfig = (key: string, cluster: string) => ({
  cluster,
  forceTLS: true,
  // Remove auth endpoint since we're not using private channels
  // authEndpoint: '/api/pusher/auth', // Removed
  // auth: {
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  // }, // Removed
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

    const response = await fetch('/api/pusher-config', {
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch Pusher config: ${response.status}`);
    }

    const config = await response.json();
    
    console.log('Fetched Pusher config from server:', {
      key: config.key ? `${config.key.substring(0, 8)}...` : 'Not set',
      cluster: config.cluster,
      keyLength: config.key?.length || 0,
    });
    
    if (!config.key || !config.cluster) {
      throw new Error('Pusher configuration not available');
    }

    const clientConfig = getPusherClientConfig(config.key, config.cluster);
    
    console.log('Creating Pusher client with simplified config:', {
      key: config.key ? `${config.key.substring(0, 8)}...` : 'Not set',
      cluster: config.cluster,
      forceTLS: clientConfig.forceTLS,
    });
    
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

    pusherClient.connection.bind('error', (error: unknown) => {
      console.error('Pusher client: Connection error:', error);
      if (error && typeof error === 'object' && 'code' in error) {
        console.error('Error details:', {
          code: (error as { code?: unknown }).code,
          data: (error as { data?: unknown }).data,
          message: (error as { message?: unknown }).message,
          type: (error as { type?: unknown }).type
        });
      }
    });

    // Log initial connection state
    console.log('Pusher client initial state:', pusherClient.connection.state);

    console.log('Pusher client initialized with simplified config:', {
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

// Debug Pusher configuration (server-side only)
if (typeof window === 'undefined') {
  console.log('Server-side Pusher Config:', {
    key: env.PUSHER_KEY ? 'Set' : 'Not set',
    cluster: env.PUSHER_CLUSTER,
    keyLength: env.PUSHER_KEY?.length || 0,
    appId: env.PUSHER_APP_ID ? 'Set' : 'Not set',
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
  static sanitizeData(data: unknown): unknown {
    if (typeof data === 'string') {
      return data.substring(0, 1000); // Limit string length
    }
    if (typeof data === 'object' && data !== null) {
      const sanitized: Record<string, unknown> = {};
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
    data: unknown
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
    eventHandlers: Record<string, (data: unknown) => void>
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