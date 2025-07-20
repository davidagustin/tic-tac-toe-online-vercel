'use client';

import * as Ably from 'ably';
import { AblyProvider, ChannelProvider, useChannel, useConnectionStateListener } from 'ably/react';
import React, { useEffect, useState } from 'react';

// Initialize Ably client
const createAblyClient = async () => {
    try {
        const response = await fetch('/api/ably-config');
        if (!response.ok) {
            throw new Error('Failed to fetch Ably config');
        }
        const config = await response.json();

        if (!config.key) {
            throw new Error('Ably API key not configured');
        }

        return new Ably.Realtime(config.key);
    } catch (error) {
        console.error('Error creating Ably client:', error);
        return null;
    }
};

// Main component
export default function AblyExample() {
    const [client, setClient] = useState<Ably.Realtime | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initClient = async () => {
            try {
                const ablyClient = await createAblyClient();
                if (ablyClient) {
                    setClient(ablyClient);
                } else {
                    setError('Failed to initialize Ably client');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setIsLoading(false);
            }
        };

        initClient();
    }, []);

    if (isLoading) {
        return (
            <div className="p-4">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-red-800 font-semibold">Error</h3>
                <p className="text-red-600">{error}</p>
                <p className="text-sm text-red-500 mt-2">
                    Please check your Ably API key configuration in .env.local
                </p>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="text-yellow-800 font-semibold">Not Connected</h3>
                <p className="text-yellow-600">Ably client not available</p>
            </div>
        );
    }

    return (
        <AblyProvider client={client}>
            <ChannelProvider channelName="test-channel">
                <AblyPubSub />
            </ChannelProvider>
        </AblyProvider>
    );
}

// Pub/Sub component
function AblyPubSub() {
    const [messages, setMessages] = useState<Array<{ id: string; data: string; timestamp: number }>>([]);
    const [inputMessage, setInputMessage] = useState('');

    // Listen for connection state
    useConnectionStateListener('connected', () => {
        console.log('✅ Connected to Ably!');
    });

    // Subscribe to messages
    const { channel } = useChannel('test-channel', 'message', (message) => {
        setMessages(prev => [...prev, {
            id: message.id || Date.now().toString(),
            data: message.data,
            timestamp: Date.now()
        }]);
    });

    const sendMessage = () => {
        if (inputMessage.trim() && channel) {
            channel.publish('message', inputMessage);
            setInputMessage('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };

    return (
        <div className="p-4 max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-4">Ably Real-time Chat</h2>

            {/* Messages */}
            <div className="bg-gray-50 p-3 rounded-lg mb-4 h-64 overflow-y-auto">
                {messages.length === 0 ? (
                    <p className="text-gray-500 text-center">No messages yet. Send one to get started!</p>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className="mb-2 p-2 bg-white rounded border">
                            <p className="text-sm">{msg.data}</p>
                            <p className="text-xs text-gray-500">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                            </p>
                        </div>
                    ))
                )}
            </div>

            {/* Input */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Send
                </button>
            </div>

            {/* Connection Status */}
            <div className="mt-4 text-sm text-gray-600">
                <p>Status: Connected to Ably</p>
                <p>Channel: test-channel</p>
                <p>Messages: {messages.length}</p>
            </div>
        </div>
    );
} 