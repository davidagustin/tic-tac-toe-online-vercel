import * as Ably from 'ably';

// Environment validation (server-side only)
const validateEnvironment = () => {
    // Only validate on server-side
    if (typeof window !== 'undefined') {
        return {
            ABLY_API_KEY: undefined,
        };
    }

    // Safe environment variable access
    const required = {
        ABLY_API_KEY: process.env.ABLY_API_KEY || undefined,
    };

    // Always return the values, don't throw errors
    return required;
};

// Get validated environment variables (server-side only)
const env = typeof window === 'undefined' ? validateEnvironment() : {
    ABLY_API_KEY: undefined,
};

// Server-side Ably instance with simplified configuration (server-side only)
const createAblyServer = () => {
    if (typeof window !== 'undefined') {
        throw new Error('AblyServer can only be created on the server-side');
    }

    const serverEnv = validateEnvironment();

    // Validate required environment variables
    if (!serverEnv.ABLY_API_KEY) {
        console.error('ABLY_API_KEY is not set');
        return null;
    }

    console.log('Creating Ably server with config:', {
        apiKey: serverEnv.ABLY_API_KEY ? `${serverEnv.ABLY_API_KEY.substring(0, 8)}...` : 'Not set',
    });

    try {
        // Create Ably server instance
        return new Ably.Rest(serverEnv.ABLY_API_KEY);
    } catch (error) {
        console.error('Failed to create Ably server:', error);
        return null;
    }
};

export const ablyServer = typeof window === 'undefined' ? createAblyServer() : null;

// Client-side Ably instance - will be initialized with config from server
let ablyClient: Ably.Realtime | null = null;

// Function to initialize Ably client with config from server
export async function initializeAblyClient(): Promise<Ably.Realtime> {
    if (ablyClient) {
        return ablyClient;
    }

    try {
        // Fetch config from server with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch('/api/ably-config', {
            signal: controller.signal,
            headers: {
                'Cache-Control': 'no-cache',
            },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Failed to fetch Ably config: ${response.status}`);
        }

        const config = await response.json();

        console.log('Fetched Ably config from server:', {
            key: config.key ? `${config.key.substring(0, 8)}...` : 'Not set',
        });

        if (!config.key) {
            throw new Error('Ably configuration not available');
        }

        console.log('Creating Ably client with config:', {
            key: config.key ? `${config.key.substring(0, 8)}...` : 'Not set',
        });

        ablyClient = new Ably.Realtime(config.key);

        // Set up connection event handlers with detailed logging
        ablyClient.connection.on('connected', () => {
            console.log('Ably client: Connected successfully');
        });

        ablyClient.connection.on('disconnected', () => {
            console.log('Ably client: Disconnected');
        });

        ablyClient.connection.on('failed', (error) => {
            console.error('Ably client: Connection failed:', error);
        });

        ablyClient.connection.on('suspended', () => {
            console.log('Ably client: Connection suspended');
        });

        ablyClient.connection.on('closing', () => {
            console.log('Ably client: Connection closing');
        });

        ablyClient.connection.on('closed', () => {
            console.log('Ably client: Connection closed');
        });

        // Log initial connection state
        console.log('Ably client initial state:', ablyClient.connection.state);

        console.log('Ably client initialized with config:', {
            key: config.key ? `${config.key.substring(0, 8)}...` : 'Not set',
        });

        return ablyClient;
    } catch (error) {
        console.error('Failed to initialize Ably client:', error);
        throw error;
    }
}

// Get existing Ably client instance
export function getAblyClient(): Ably.Realtime | null {
    return ablyClient;
}

// Cleanup function
export function cleanupAblyClient(): void {
    if (ablyClient) {
        ablyClient.close();
        ablyClient = null;
    }
}

// Debug Ably configuration (server-side only)
if (typeof window === 'undefined') {
    console.log('Server-side Ably Config:', {
        apiKey: env.ABLY_API_KEY ? 'Set' : 'Not set',
        keyLength: env.ABLY_API_KEY?.length || 0,
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
const channelCache = new Map<string, Ably.RealtimeChannel>();

export function subscribeToChannel(ably: Ably.Realtime, channelName: string) {
    if (channelCache.has(channelName)) {
        return channelCache.get(channelName)!;
    }

    const channel = ably.channels.get(channelName);
    channelCache.set(channelName, channel);
    return channel;
}

export function unsubscribeFromChannel(ably: Ably.Realtime, channelName: string) {
    if (channelCache.has(channelName)) {
        const channel = ably.channels.get(channelName);
        channel.unsubscribe();
        channelCache.delete(channelName);
    }
}

export function clearChannelCache() {
    channelCache.clear();
} 