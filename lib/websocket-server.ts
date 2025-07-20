import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { parse } from 'url';
import { WebSocketServer } from 'ws';
import { appRouter } from './routers';

interface WebSocketMessage {
    type: string;
    data: any;
    gameId?: string;
}

// Store active connections
const connections = new Map<string, any>();
const gameConnections = new Map<string, Set<string>>(); // gameId -> Set of connectionIds

export function createWebSocketServer(server: any) {
    const wss = new WebSocketServer({ server });

    // Apply tRPC WebSocket handler
    applyWSSHandler({
        wss,
        router: appRouter,
        createContext: async (opts) => {
            const { req } = opts;
            const url = parse(req.url || '', true);

            // Extract user from query params or headers
            let user = null;
            const username = url.query.username as string;
            if (username) {
                // Import here to avoid circular dependency
                const { AuthService } = await import('./auth');
                user = await AuthService.getUserByUsername(username);
            }

            return {
                user: user || null,
                req,
                res: {} as any,
            };
        },
    });

    // Handle WebSocket connections
    wss.on('connection', (ws, req) => {
        const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        connections.set(connectionId, ws);

        console.log(`WebSocket connected: ${connectionId}`);

        // Handle messages
        ws.on('message', (data) => {
            try {
                const message: WebSocketMessage = JSON.parse(data.toString());
                handleWebSocketMessage(connectionId, message);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        });

        // Handle disconnection
        ws.on('close', () => {
            console.log(`WebSocket disconnected: ${connectionId}`);
            connections.delete(connectionId);

            // Remove from game connections
            for (const [gameId, conns] of gameConnections.entries()) {
                conns.delete(connectionId);
                if (conns.size === 0) {
                    gameConnections.delete(gameId);
                }
            }
        });

        // Handle errors
        ws.on('error', (error) => {
            console.error(`WebSocket error for ${connectionId}:`, error);
            connections.delete(connectionId);
        });
    });

    return wss;
}

function handleWebSocketMessage(connectionId: string, message: WebSocketMessage) {
    const { type, data, gameId } = message;

    switch (type) {
        case 'joinGame':
            if (gameId) {
                if (!gameConnections.has(gameId)) {
                    gameConnections.set(gameId, new Set());
                }
                gameConnections.get(gameId)!.add(connectionId);
                console.log(`Connection ${connectionId} joined game ${gameId}`);
            }
            break;

        case 'leaveGame':
            if (gameId) {
                const conns = gameConnections.get(gameId);
                if (conns) {
                    conns.delete(connectionId);
                    if (conns.size === 0) {
                        gameConnections.delete(gameId);
                    }
                }
                console.log(`Connection ${connectionId} left game ${gameId}`);
            }
            break;

        case 'gameUpdate':
            // Broadcast game update to all connections in the game
            if (gameId) {
                broadcastToGame(gameId, {
                    type: 'gameUpdate',
                    data,
                    gameId,
                });
            }
            break;

        case 'chatMessage':
            // Broadcast chat message to all connections in the game
            if (gameId) {
                broadcastToGame(gameId, {
                    type: 'chatMessage',
                    data,
                    gameId,
                });
            }
            break;

        default:
            console.log(`Unknown message type: ${type}`);
    }
}

export function broadcastToGame(gameId: string, message: WebSocketMessage) {
    const conns = gameConnections.get(gameId);
    if (conns) {
        const messageStr = JSON.stringify(message);
        conns.forEach(connectionId => {
            const ws = connections.get(connectionId);
            if (ws && ws.readyState === 1) { // WebSocket.OPEN
                ws.send(messageStr);
            }
        });
        console.log(`Broadcasted to ${conns.size} connections in game ${gameId}`);
    }
}

export function broadcastToAll(message: WebSocketMessage) {
    const messageStr = JSON.stringify(message);
    connections.forEach((ws, connectionId) => {
        if (ws.readyState === 1) { // WebSocket.OPEN
            ws.send(messageStr);
        }
    });
}

export function getConnectionCount(): number {
    return connections.size;
}

export function getGameConnectionCount(gameId: string): number {
    return gameConnections.get(gameId)?.size || 0;
} 