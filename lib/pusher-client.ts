import PusherClient, { Channel } from 'pusher-js';

// Client-side Pusher instance - will be initialized with config from server
let pusherClient: PusherClient | null = null;

// Enhanced Pusher client configuration for stability
const getPusherClientConfig = (key: string, cluster: string) => ({
  cluster,
  forceTLS: true,
  // Enhanced connection settings
  activityTimeout: 30000,        // 30 seconds
  pongTimeout: 15000,            // 15 seconds (50% of activityTimeout)
  maxReconnectionAttempts: 5,    // Increased from default 3
  maxReconnectGap: 30000,        // 30 seconds max gap
  enableStats: false,            // Disable stats to reduce overhead
  enableLogging: false,          // Disable logging in production
  // Connection optimization
  authEndpoint: '/api/pusher/auth',
  auth: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
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

    // Add reconnection event handlers
    pusherClient.connection.bind('reconnecting', () => {
      console.log('Pusher client: Reconnecting...');
    });

    pusherClient.connection.bind('reconnected', () => {
      console.log('Pusher client: Reconnected successfully');
    });

    return pusherClient;
  } catch (error) {
    console.error('Failed to initialize Pusher client:', error);
    throw error;
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

// Types
export interface Game {
  id: string;
  name: string;
  players: string[];
  status: 'waiting' | 'playing' | 'finished';
  createdBy: string;
  createdAt: string;
  board: (string | null)[];
  currentPlayer: string | null;
  winner: string | null;
}

export interface ChatMessage {
  id: string;
  text: string;
  userName: string;
  gameId: string;
  timestamp: string;
}

export interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
}

// Channel management utilities
const channelCache = new Map<string, Channel>();

export function subscribeToChannel(pusher: PusherClient, channelName: string) {
  if (channelCache.has(channelName)) {
    return channelCache.get(channelName)!;
  }

  const channel = pusher.subscribe(channelName);
  channelCache.set(channelName, channel);
  return channel;
}

export function unsubscribeFromChannel(pusher: PusherClient, channelName: string) {
  if (channelCache.has(channelName)) {
    pusher.unsubscribe(channelName);
    channelCache.delete(channelName);
  }
}

export function clearChannelCache() {
  channelCache.clear();
} 