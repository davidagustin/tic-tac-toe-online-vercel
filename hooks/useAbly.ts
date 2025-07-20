'use client';

import { CHANNELS, type ChatMessage, clearChannelCache, type Game, type PlayerStats, subscribeToChannel, unsubscribeFromChannel } from '@/lib/ably';
import * as Ably from 'ably';
import { useCallback, useEffect, useRef, useState } from 'react';

// Enhanced configuration for stability
const CONNECTION_TIMEOUT = 30000; // 30 seconds
const MAX_RECONNECT_ATTEMPTS = 5; // Increased from 3
const RECONNECT_DELAY = 5000; // 5 seconds base delay
const CONFIG_CACHE_TIME = 300000; // 5 minutes
const HEARTBEAT_INTERVAL = 25000; // 25 seconds
const RATE_LIMIT_DELAY = 1000; // 1 second between rapid events

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Debounce utility
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// Rate limiting utility
function checkRateLimit(action: string, limit: number = 10, window: number = 60000): boolean {
    const now = Date.now();
    const key = `rate_limit:${action}`;

    const current = rateLimitStore.get(key);

    if (!current || current.resetTime < now) {
        rateLimitStore.set(key, {
            count: 1,
            resetTime: now + window
        });
        return true;
    }

    if (current.count >= limit) {
        return false;
    }

    current.count++;
    return true;
}

export function useAbly() {
    const [ably, setAbly] = useState<Ably.Realtime | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const [games, setGames] = useState<Game[]>([]);
    const [currentGame, setCurrentGame] = useState<Game | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);

    // Refs to prevent race conditions
    const isConnectingRef = useRef(false);
    const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const configCacheRef = useRef<{ config: any; timestamp: number } | null>(null);
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lobbyChannel = useRef<any>(null);
    const gameChannel = useRef<any>(null);
    const userChannel = useRef<any>(null);
    const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Debounced cleanup function to prevent multiple simultaneous calls
    const debouncedCleanup = useCallback(
        debounce(async () => {
            console.log('🧹 Debounced cleanup triggered...');
            try {
                // Clear games state
                setGames([]);
                setCurrentGame(null);
                setChatMessages([]);

                // Clear localStorage
                localStorage.removeItem('ticTacToeUser');
                localStorage.removeItem('currentUser');
                sessionStorage.clear();

                console.log('✅ Cleanup completed');
            } catch (error) {
                console.error('❌ Cleanup error:', error);
            }
        }, 1000), // 1 second debounce
        [setGames, setCurrentGame, setChatMessages]
    );

    // Get Ably configuration with caching
    const getAblyConfig = useCallback(async () => {
        if (configCacheRef.current && Date.now() - configCacheRef.current.timestamp < CONFIG_CACHE_TIME) {
            return configCacheRef.current.config;
        }

        try {
            const response = await fetch('/api/ably-config');
            if (!response.ok) {
                throw new Error('Failed to fetch Ably config');
            }
            const config = await response.json();

            configCacheRef.current = {
                config,
                timestamp: Date.now()
            };

            return config;
        } catch (error) {
            console.error('❌ Error fetching Ably config:', error);
            throw error;
        }
    }, []);

    // Heartbeat system to keep connection alive
    const startHeartbeat = useCallback(() => {
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
        }

        heartbeatIntervalRef.current = setInterval(() => {
            if (ably?.connection.state === 'connected') {
                // Send a lightweight event to keep connection alive
                try {
                    const channel = ably.channels.get('heartbeat');
                    channel.publish('ping', { timestamp: Date.now() });
                } catch (error) {
                    console.warn('Heartbeat failed:', error);
                }
            }
        }, HEARTBEAT_INTERVAL);
    }, [ably]);

    // Initialize Ably connection with enhanced stability
    const connect = useCallback(async () => {
        if (isConnectingRef.current || ably?.connection.state === 'connected') {
            console.log('🔌 Already connecting or connected, skipping...');
            return;
        }

        try {
            isConnectingRef.current = true;
            setIsInitializing(true);
            setConnectionError(null);

            console.log('🔌 Initializing Ably connection...');
            const config = await getAblyConfig();

            if (!config.key) {
                throw new Error('Invalid Ably configuration');
            }

            // Create new Ably instance with enhanced settings
            const newAbly = new Ably.Realtime(config.key);

            // Set up connection event handlers
            newAbly.connection.on('connected', () => {
                console.log('✅ Ably connected successfully');
                setIsConnected(true);
                setIsInitializing(false);
                setConnectionError(null);
                setReconnectAttempts(0);
                isConnectingRef.current = false;
                startHeartbeat();
            });

            newAbly.connection.on('disconnected', () => {
                console.log('❌ Ably disconnected');
                setIsConnected(false);
                setIsInitializing(false);
                if (heartbeatIntervalRef.current) {
                    clearInterval(heartbeatIntervalRef.current);
                }
            });

            newAbly.connection.on('failed', (error: any) => {
                console.error('❌ Ably connection error:', error);
                setConnectionError(error.message || 'Connection failed');
                setIsConnected(false);
                setIsInitializing(false);
                isConnectingRef.current = false;
                if (heartbeatIntervalRef.current) {
                    clearInterval(heartbeatIntervalRef.current);
                }
            });

            newAbly.connection.on('suspended', () => {
                console.log('🔄 Ably connection suspended');
                setIsConnected(false);
                setReconnectAttempts(prev => prev + 1);
                if (heartbeatIntervalRef.current) {
                    clearInterval(heartbeatIntervalRef.current);
                }
            });

            newAbly.connection.on('connected', () => {
                console.log('✅ Ably reconnected successfully');
                setIsConnected(true);
                setReconnectAttempts(0);
                startHeartbeat();
            });

            setAbly(newAbly);

            // Set connection timeout
            connectionTimeoutRef.current = setTimeout(() => {
                if (newAbly.connection.state !== 'connected') {
                    console.error('❌ Connection timeout');
                    setConnectionError('Connection timeout');
                    setIsInitializing(false);
                    isConnectingRef.current = false;
                    newAbly.close();
                }
            }, CONNECTION_TIMEOUT);

        } catch (error) {
            console.error('❌ Error initializing Ably:', error);
            setConnectionError(error instanceof Error ? error.message : 'Initialization failed');
            setIsInitializing(false);
            isConnectingRef.current = false;
        }
    }, [getAblyConfig, ably?.connection.state, startHeartbeat]);

    // Disconnect and cleanup with enhanced error handling
    const disconnect = useCallback(() => {
        console.log('🔌 Disconnecting from Ably...');

        // Clear timeouts
        if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
        }
        if (cleanupTimeoutRef.current) {
            clearTimeout(cleanupTimeoutRef.current);
        }
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
        }

        // Unsubscribe from channels with validation
        if (ably) {
            try {
                if (lobbyChannel.current) {
                    unsubscribeFromChannel(ably, 'lobby');
                    lobbyChannel.current = null;
                }
                if (gameChannel.current && currentGame?.id) {
                    const channelName = CHANNELS.GAME(currentGame.id);
                    unsubscribeFromChannel(ably, channelName);
                    gameChannel.current = null;
                }
                if (userChannel.current) {
                    const channelName = userChannel.current.name;
                    if (channelName) {
                        unsubscribeFromChannel(ably, channelName);
                        userChannel.current = null;
                    }
                }
                ably.close();
            } catch (error) {
                console.error('Error disconnecting from Ably:', error);
            }
        }

        // Clear channel cache
        clearChannelCache();

        // Reset state
        setAbly(null);
        setIsConnected(false);
        setIsInitializing(false);
        setConnectionError(null);
        setReconnectAttempts(0);
        setGames([]);
        setCurrentGame(null);
        setChatMessages([]);
        setPlayerStats(null);

        // Clear refs
        isConnectingRef.current = false;
    }, [ably, currentGame?.id]);

    // Subscribe to lobby with rate limiting
    const subscribeToLobby = useCallback(() => {
        if (!ably || !isConnected) {
            console.log('❌ Cannot subscribe to lobby - not connected');
            return;
        }

        if (!checkRateLimit('lobby_subscribe', 5, 60000)) {
            console.log('⚠️ Rate limit exceeded for lobby subscription');
            return;
        }

        try {
            console.log('🔌 Subscribing to lobby...');
            const channel = subscribeToChannel(ably, 'lobby');

            channel.subscribe('games-updated', (message: any) => {
                console.log('📡 Lobby games updated:', message.data);
                setGames(message.data.games);
            });

            channel.subscribe('game-created', (message: any) => {
                console.log('📡 New game created:', message.data);
                setGames(prev => [...prev, message.data.game]);
            });

            channel.subscribe('game-removed', (message: any) => {
                console.log('📡 Game removed:', message.data);
                setGames(prev => prev.filter(game => game.id !== message.data.gameId));
            });

            channel.subscribe('game-updated', (message: any) => {
                console.log('📡 Game updated:', message.data);
                setGames(prev => prev.map(game => game.id === message.data.game.id ? message.data.game : game));
            });

            lobbyChannel.current = channel;
        } catch (error) {
            console.error('❌ Error subscribing to lobby:', error);
        }
    }, [ably, isConnected]);

    // Subscribe to user stats with rate limiting
    const subscribeToUser = useCallback((userName: string) => {
        if (!ably || !isConnected || !userName) {
            console.log('❌ Cannot subscribe to user - not connected or invalid user');
            return;
        }

        if (!checkRateLimit('user_subscribe', 3, 60000)) {
            console.log('⚠️ Rate limit exceeded for user subscription');
            return;
        }

        try {
            console.log('🔌 Subscribing to user stats:', userName);
            const channelName = CHANNELS.USER(userName);
            const channel = subscribeToChannel(ably, channelName);

            channel.subscribe('stats-updated', (message: any) => {
                console.log('📊 User stats updated:', message.data);
                setPlayerStats(message.data);
            });

            userChannel.current = channel;
        } catch (error) {
            console.error('❌ Error subscribing to user channel:', error);
        }
    }, [ably, isConnected]);

    // Join game with rate limiting
    const joinGame = useCallback(async (gameId: string, userName: string) => {
        if (!ably || !isConnected) {
            console.log('❌ Cannot join game - not connected');
            return;
        }

        if (!checkRateLimit('game_join', 5, 60000)) {
            console.log('⚠️ Rate limit exceeded for game join');
            throw new Error('Rate limit exceeded. Please wait before trying again.');
        }

        try {
            console.log('🎮 Joining game:', gameId);
            const response = await fetch('/api/game/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId, userName }),
            });

            if (!response.ok) {
                throw new Error('Failed to join game');
            }

            const data = await response.json();
            setCurrentGame(data.game);

            // Subscribe to game channel
            const channelName = CHANNELS.GAME(gameId);
            const channel = subscribeToChannel(ably, channelName);

            channel.subscribe('game-updated', (message: any) => {
                console.log('📡 Game updated:', message.data);
                setCurrentGame(message.data.game);
            });

            channel.subscribe('chat-message', (message: any) => {
                console.log('📡 Chat message received:', message.data);
                setChatMessages(prev => [...prev, message.data]);
            });

            channel.subscribe('game-ended', (message: any) => {
                console.log('📡 Game ended:', message.data);
                setCurrentGame(prev => prev ? { ...prev, status: 'finished', winner: message.data.winner } : null);
            });

            gameChannel.current = channel;
            console.log('✅ Successfully joined game');
        } catch (error) {
            console.error('❌ Error joining game:', error);
            throw error;
        }
    }, [ably, isConnected]);

    // Leave game with cleanup
    const leaveGame = useCallback(() => {
        if (gameChannel.current && ably && currentGame?.id) {
            try {
                console.log('🔌 Leaving game channel:', currentGame.id);
                const channelName = CHANNELS.GAME(currentGame.id);
                unsubscribeFromChannel(ably, channelName);
                gameChannel.current = null;
            } catch (error) {
                console.error('Error disconnecting from Ably:', error);
            }
        }
        setCurrentGame(null);
        setChatMessages([]);
    }, [ably, currentGame?.id]);

    // Clear games (debounced)
    const clearGames = useCallback(() => {
        debouncedCleanup();
    }, [debouncedCleanup]);

    // Auto-connect on mount
    useEffect(() => {
        connect();

        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    // Auto-subscribe to lobby when connected
    useEffect(() => {
        if (isConnected && ably) {
            subscribeToLobby();
        }
    }, [isConnected, ably, subscribeToLobby]);

    return {
        ably,
        isConnected,
        isInitializing,
        connectionError,
        reconnectAttempts,
        connect,
        disconnect,
        joinGame,
        leaveGame,
        subscribeToLobby,
        subscribeToUser,
        games,
        currentGame,
        chatMessages,
        playerStats,
        clearGames,
    };
} 