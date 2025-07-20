import PusherClient from 'pusher-js';

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

    // Add reconnection event handlers
    pusherClient.connection.bind('reconnecting', () => {
      console.log('Pusher client: Reconnecting...');
    });

    pusherClient.connection.bind('reconnected', () => {
      console.log('Pusher client: Reconnected successfully');
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