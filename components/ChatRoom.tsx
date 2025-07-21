'use client';

import { useTrpcGame } from '@/hooks/useTrpcGame';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface Message {
  id: number;
  text: string;
  user_name: string;
  timestamp: string;
}

interface ChatRoomProps {
  userName: string;
  title: string;
  description: string;
  theme: 'blue' | 'green';
  icon: string;
}

export default function ChatRoom({ userName, title, description, theme, icon }: ChatRoomProps) {
  const { isConnected, chatMessages } = useTrpcGame();
  const [text, setText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Determine if chat is available (only when connected)
  const isChatAvailable = isConnected;

  // Use Pusher messages if connected, otherwise use local messages
  const displayMessages = isConnected ? chatMessages : localMessages;

  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [displayMessages, scrollToBottom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      setIsLoading(true);

      // Basic client-side validation
      if (text.length > 500) {
        alert('Message too long. Maximum 500 characters allowed.');
        return;
      }

      // Check for potentially malicious content
      const suspiciousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(text)) {
          alert('Message contains invalid content.');
          return;
        }
      }

      if (isConnected) {
        // Send message via API for real-time chat
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text, userName }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }
      } else {
        // Add message locally when not connected
        const newMessage: Message = {
          id: Date.now(),
          text: text.trim(),
          user_name: userName,
          timestamp: new Date().toISOString(),
        };
        setLocalMessages(prev => [...prev, newMessage]);
      }

      setText('');
    } catch (error: unknown) {
      console.error('Error posting message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Theme configuration
  const config = {
    blue: {
      bgGradient: 'from-blue-600/20 to-cyan-600/20',
      gradient: 'from-blue-500/20 to-cyan-500/20',
      border: 'border-blue-400/30',
      avatar: 'from-blue-500 to-cyan-500',
      button: 'from-blue-600 to-cyan-600',
      shadow: 'shadow-blue-500/25',
      loading: 'border-blue-400'
    },
    green: {
      bgGradient: 'from-green-600/20 to-emerald-600/20',
      gradient: 'from-green-500/20 to-emerald-500/20',
      border: 'border-green-400/30',
      avatar: 'from-green-500 to-emerald-500',
      button: 'from-green-600 to-emerald-600',
      shadow: 'shadow-green-500/25',
      loading: 'border-green-400'
    }
  }[theme];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">{icon} {title}</h2>
        <p className="text-purple-200">{description}</p>
      </div>

      {/* Chat Messages */}
      <div className="space-y-4">
        <div className={`bg-gradient-to-br ${config.bgGradient} rounded-2xl p-4 border border-white/20`}>
          <div
            ref={chatContainerRef}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-4 h-80 sm:h-96 overflow-y-auto shadow-inner border border-white/20 scroll-smooth"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${config.loading} mx-auto mb-2`}></div>
                  <p className="text-purple-200">Loading messages...</p>
                </div>
              </div>
            ) : displayMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-4xl mb-3">{icon}</div>
                  <p className="text-purple-200 text-lg">No messages yet</p>
                  <p className="text-purple-300 text-sm">Start the conversation!</p>
                </div>
              </div>
            ) : (
              <ul className="space-y-3">
                {displayMessages.map((message, i) => (
                  <li key={message.id || i} className={`mb-3 p-4 bg-gradient-to-r ${config.gradient} rounded-2xl ${config.border} shadow-sm`}>
                    <div className="flex items-start space-x-3">
                      <div className={`w-8 h-8 bg-gradient-to-r ${config.avatar} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white font-semibold text-sm">👤</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-purple-300 font-semibold text-sm">
                            {('userName' in message ? message.userName : message.user_name) as string}
                          </span>
                          <span className="text-purple-400 text-xs">•</span>
                          <span className="text-purple-400 text-xs">{message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : new Date(message.id).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-white text-lg leading-relaxed">{message.text}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Send Message */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-white text-center">💭 Send Message</h3>
        <form onSubmit={handleSubmit} className="space-y-4" suppressHydrationWarning>
          <div className="flex space-x-3">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={`flex-1 px-4 py-3 border-2 border-white/20 rounded-xl focus:outline-none focus:border-green-600 bg-white/10 backdrop-blur-sm text-white placeholder-pink-200 text-lg transition-all duration-200`}
              placeholder="Type your message..."
              disabled={!isChatAvailable}
            />
            <button
              type="submit"
              disabled={!isChatAvailable || !text.trim() || isLoading}
              className={`bg-gradient-to-r ${config.button} text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg ${config.shadow} disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2`}
            >
              <span>📤</span>
              <span>{isLoading ? 'Sending...' : 'Send'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Connection Status */}
      <div className="text-center">
        <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${isChatAvailable
            ? isConnected
              ? 'bg-green-500/20 text-green-300 border border-green-400/30'
              : 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/30'
            : 'bg-red-500/20 text-red-300 border border-red-400/30'
          }`}>
          <div className={`w-2 h-2 rounded-full ${isChatAvailable
              ? isConnected
                ? 'bg-green-400 animate-pulse'
                : 'bg-yellow-400'
              : 'bg-red-400'
            }`}></div>
          <span className="font-medium">
            {isConnected
              ? 'Connected to chat'
              : 'Disconnected from chat'
            }
          </span>
        </div>
      </div>
    </div>
  );
} 