import { initTRPC, TRPCError } from '@trpc/server';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import superjson from 'superjson';
import { z, ZodError } from 'zod';

// Import existing auth service
import { AuthService, type User } from './auth';

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 */

interface CreateContextOptions {
    user: User | null;
    req?: any;
    res?: any;
}

/**
 * This helper generates the "internals" for a tRPC context.
 */
const createInnerTRPCContext = (opts: CreateContextOptions) => {
    return {
        user: opts.user,
        req: opts.req,
        res: opts.res,
    };
};

/**
 * This is the actual context you will use in your router.
 */
export const createTRPCContext = async (opts: CreateNextContextOptions) => {
    const { req, res } = opts;

    // Extract user from session/cookies (simplified for now)
    let user: User | null = null;

    try {
        // Check for user session in cookies or headers
        const sessionToken = req.cookies?.session || req.headers?.authorization;
        if (sessionToken) {
            // This is a simplified session check - you might want to implement proper session management
            // For now, we'll use a basic approach
            const username = req.cookies?.username || req.headers?.['x-username'];
            if (username && typeof username === 'string') {
                const foundUser = await AuthService.getUserByUsername(username);
                user = foundUser || null;
            }
        }
    } catch (error) {
        console.error('Error getting user from context:', error);
    }

    return createInnerTRPCContext({
        user,
        req,
        res,
    });
};

/**
 * 2. INITIALIZATION
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
    transformer: superjson,
    errorFormatter({ shape, error }) {
        return {
            ...shape,
            data: {
                ...shape.data,
                zodError:
                    error.cause instanceof ZodError ? error.cause.flatten() : null,
            },
        };
    },
});

/**
 * 3. ROUTER & PROCEDURE
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 */
export const createTRPCRouter = t.router;

/**
 * Public (unauthenticated) procedure
 */
export const publicProcedure = t.procedure;

/**
 * Protected (authenticated) procedure
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
    if (!ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return next({
        ctx: {
            ...ctx,
            user: ctx.user,
        },
    });
});

/**
 * Subscription procedure for real-time updates
 */
export const subscriptionProcedure = t.procedure.use(({ ctx, next }) => {
    if (!ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return next({
        ctx: {
            ...ctx,
            user: ctx.user,
        },
    });
});

/**
 * 4. INPUT VALIDATION SCHEMAS
 */
export const authSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
});

export const gameSchema = z.object({
    gameName: z.string().min(1, 'Game name is required'),
});

export const moveSchema = z.object({
    gameId: z.string().min(1, 'Game ID is required'),
    position: z.number().min(0).max(8, 'Position must be between 0 and 8'),
});

export const chatSchema = z.object({
    message: z.string().min(1, 'Message is required'),
    gameId: z.string().optional(),
});

export const subscriptionSchema = z.object({
    gameId: z.string().min(1, 'Game ID is required'),
});

/**
 * 5. WEBSOCKET SUPPORT
 */
export interface WebSocketContext {
    user: User | null;
    gameId?: string;
    connectionId: string;
}

export const createWebSocketContext = (user: User | null, connectionId: string, gameId?: string): WebSocketContext => ({
    user,
    gameId,
    connectionId,
});

export const wsProcedure = t.procedure;

/**
 * 6. REAL-TIME EVENT TYPES
 */
export interface GameEvent {
    type: 'gameCreated' | 'playerJoined' | 'moveMade' | 'gameFinished' | 'playerLeft' | 'chatMessage';
    gameId: string;
    data: any;
    timestamp: number;
    userId?: string;
}

export interface ChatMessage {
    id: string;
    gameId: string;
    userId: string;
    username: string;
    message: string;
    timestamp: number;
}

/**
 * 7. GAME STATE MANAGEMENT
 */
export interface GameState {
    id: string;
    name: string;
    board: string[];
    currentPlayer: string;
    players: string[];
    status: 'waiting' | 'playing' | 'finished';
    winner?: string;
    createdAt: Date;
    lastMove?: {
        position: number;
        symbol: string;
        player: string;
    };
}

// In-memory storage for games and connections
export const games = new Map<string, GameState>();
export const gameConnections = new Map<string, Set<string>>();
export const userConnections = new Map<string, Set<string>>();
export const gameEvents = new Map<string, GameEvent[]>();

// Helper functions for real-time updates
export const addGameConnection = (gameId: string, connectionId: string) => {
    if (!gameConnections.has(gameId)) {
        gameConnections.set(gameId, new Set());
    }
    gameConnections.get(gameId)!.add(connectionId);
};

export const removeGameConnection = (gameId: string, connectionId: string) => {
    const connections = gameConnections.get(gameId);
    if (connections) {
        connections.delete(connectionId);
        if (connections.size === 0) {
            gameConnections.delete(gameId);
        }
    }
};

export const addUserConnection = (userId: string, connectionId: string) => {
    if (!userConnections.has(userId)) {
        userConnections.set(userId, new Set());
    }
    userConnections.get(userId)!.add(connectionId);
};

export const removeUserConnection = (userId: string, connectionId: string) => {
    const connections = userConnections.get(userId);
    if (connections) {
        connections.delete(connectionId);
        if (connections.size === 0) {
            userConnections.delete(userId);
        }
    }
};

export const broadcastGameEvent = (gameId: string, event: GameEvent) => {
    // Store event for new connections
    if (!gameEvents.has(gameId)) {
        gameEvents.set(gameId, []);
    }
    gameEvents.get(gameId)!.push(event);

    // Keep only last 50 events
    const events = gameEvents.get(gameId)!;
    if (events.length > 50) {
        events.splice(0, events.length - 50);
    }

    console.log(`Broadcasting game event: ${event.type} for game ${gameId}`);
    // In WebSocket implementation, this would send to all connected clients
    return event;
};

export const getGameEvents = (gameId: string, since?: number): GameEvent[] => {
    const events = gameEvents.get(gameId) || [];
    if (since) {
        return events.filter(event => event.timestamp > since);
    }
    return events;
}; 