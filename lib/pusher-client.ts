import PusherClient from 'pusher-js';

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
    
    if (!config.key || !config.cluster) {
      throw new Error('Pusher configuration not available');
    }

    const clientConfig = getPusherClientConfig(config.key, config.cluster);
    
    pusherClient = new PusherClient(config.key, clientConfig);

    // Set up connection event handlers with essential logging
    pusherClient.connection.bind('connecting', () => {
      // Connection attempt started
    });

    pusherClient.connection.bind('connected', () => {
      // Connection successful
    });

    pusherClient.connection.bind('disconnected', () => {
      // Connection lost
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

    // Add reconnection event handlers
    pusherClient.connection.bind('reconnecting', () => {
      // Reconnecting
    });

    pusherClient.connection.bind('reconnected', () => {
      // Reconnected successfully
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