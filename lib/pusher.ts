import PusherServer from 'pusher';
import PusherClient from 'pusher-js';

// Server-side Pusher instance
export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
  useTLS: true,
});

// Client-side Pusher instance
export const pusherClient = new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_KEY || '',
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
    forceTLS: true,
  }
);

// Debug Pusher configuration
if (typeof window !== 'undefined') {
  console.log('Pusher Config:', {
    key: process.env.NEXT_PUBLIC_PUSHER_KEY ? 'Set' : 'Not set',
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
    keyLength: process.env.NEXT_PUBLIC_PUSHER_KEY?.length || 0,
  });
  
  // Test if environment variables are accessible
  if (!process.env.NEXT_PUBLIC_PUSHER_KEY) {
    console.error('PUSHER_KEY is not set!');
  }
  if (!process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
    console.error('PUSHER_CLUSTER is not set!');
  }
}

// Channel names
export const CHANNELS = {
  LOBBY: 'lobby',
  GAME: (gameId: string) => `game-${gameId}`,
  USER: (userId: string) => `user-${userId}`,
};

// Event names
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
};

// Game state interface
export interface Game {
  id: string;
  name: string;
  players: string[];
  status: 'waiting' | 'playing' | 'finished';
  createdBy: string;
  createdAt: Date;
  board: (string | null)[];
  currentPlayer: string | null;
  winner: string | null;
}

// Player interface
export interface Player {
  userName: string;
  gameId: string | null;
}

// Chat message interface
export interface ChatMessage {
  id: number;
  text: string;
  user_name: string;
  timestamp: Date;
  game_id?: string;
}

// Statistics interface
export interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
  total_games: number;
} 