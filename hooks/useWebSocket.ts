import { useCallback, useEffect, useRef, useState } from 'react';

interface WebSocketMessage {
    type: string;
    data: any;
    gameId?: string;
}

interface UseWebSocketOptions {
    url?: string;
    gameId?: string;
    username?: string;
    onMessage?: (message: WebSocketMessage) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Event) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
    const {
        url = process.env.NODE_ENV === 'development'
            ? 'ws://localhost:3001'
            : `wss://${window.location.host}`,
        gameId,
        username,
        onMessage,
        onConnect,
        onDisconnect,
        onError,
    } = options;

    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionId, setConnectionId] = useState<string | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const connect = useCallback((force = false) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            // Add username to query params for authentication
            const wsUrl = username ? `${url}?username=${encodeURIComponent(username)}` : url;
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('WebSocket connected');
                setIsConnected(true);
                onConnect?.();

                // Join game if gameId is provided
                if (gameId) {
                    sendMessage({
                        type: 'joinGame',
                        data: { gameId },
                        gameId,
                    });
                }
            };

            ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    console.log('WebSocket message received:', message);
                    onMessage?.(message);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            ws.onclose = (event) => {
                console.log('WebSocket disconnected:', event.code, event.reason);
                setIsConnected(false);
                setConnectionId(null);
                onDisconnect?.();

                // Attempt to reconnect after 3 seconds
                if (event.code !== 1000) { // Not a normal closure
                    reconnectTimeoutRef.current = setTimeout(() => {
                        console.log('Attempting to reconnect...');
                        connect();
                    }, 3000);
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                onError?.(error);
            };
        } catch (error) {
            console.error('Error creating WebSocket connection:', error);
        }
    }, [url, username, gameId, onConnect, onDisconnect, onError]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        if (wsRef.current) {
            // Leave game if gameId is provided
            if (gameId) {
                sendMessage({
                    type: 'leaveGame',
                    data: { gameId },
                    gameId,
                });
            }

            wsRef.current.close(1000, 'User disconnected');
            wsRef.current = null;
        }
    }, [gameId]);

    const sendMessage = useCallback((message: WebSocketMessage) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket is not connected, cannot send message:', message);
        }
    }, []);

    const sendGameUpdate = useCallback((data: any) => {
        if (gameId) {
            sendMessage({
                type: 'gameUpdate',
                data,
                gameId,
            });
        }
    }, [gameId, sendMessage]);

    const sendChatMessage = useCallback((data: any) => {
        if (gameId) {
            sendMessage({
                type: 'chatMessage',
                data,
                gameId,
            });
        }
    }, [gameId, sendMessage]);

    // Connect on mount
    useEffect(() => {
        connect(true);

        // Cleanup on unmount
        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    // Reconnect when gameId or username changes
    useEffect(() => {
        if (isConnected) {
            disconnect();
            connect();
        }
    }, [gameId, username]);

    return {
        isConnected,
        connectionId,
        sendMessage,
        sendGameUpdate,
        sendChatMessage,
        connect,
        disconnect,
    };
} 