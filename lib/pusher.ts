import PusherServer from 'pusher';
import PusherClient from 'pusher-js';

// Environment validation
const validateEnvironment = () => {
  const required = {
    PUSHER_APP_ID: process.env.PUSHER_APP_ID,
    PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY,
    PUSHER_SECRET: process.env.PUSHER_SECRET,
    PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required Pusher environment variables: ${missing.join(', ')}`);
  }

  return required;
};

// Get validated environment variables
const env = validateEnvironment();

// Server-side Pusher instance with best practices
export const pusherServer = new PusherServer({
  appId: env.PUSHER_APP_ID!,
  key: env.PUSHER_KEY!,
  secret: env.PUSHER_SECRET!,
  cluster: env.PUSHER_CLUSTER!,
  useTLS: true,
  // Security settings
  encryptionMasterKeyBase64: process.env.PUSHER_ENCRYPTION_MASTER_KEY,
});

// Client-side Pusher instance - will be initialized with config from server
let pusherClient: PusherClient | null = null;

// Enhanced Pusher client configuration
const getPusherClientConfig = (key: string, cluster: string) => ({
  cluster,
  forceTLS: true,
  // Performance settings
  disableStats: true, // Disable stats collection for better performance
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
    
    pusherClient = new PusherClient(config.key, clientConfig);

    // Set up connection event handlers
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
    });

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