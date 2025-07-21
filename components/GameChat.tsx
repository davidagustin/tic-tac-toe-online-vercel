'use client';

import { useTrpcGame } from '@/hooks/useTrpcGame';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface ChatMessage {
  id: string;
  gameId: string;
  userName: string;
  message: string;
  timestamp: string;
}

interface GameChatProps {
  userName: string;
  gameId: string;
  title: string;
  description: string;
  theme: 'blue' | 'green';
  icon: string;
}

export default function GameChat({ userName, gameId, title, description, theme, icon }: GameChatProps) {
  const { isConnected, chatMessages } = useTrpcGame();
  const [text, setText] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, []);

  // Update messages when chatMessages from Pusher changes
  useEffect(() => {
    if (chatMessages) {
      // Filter messages for this specific game
      const gameMessages = chatMessages.filter(msg => msg.gameId === gameId);
      setMessages(gameMessages);
      setTimeout(scrollToBottom, 100);
    }
  }, [chatMessages, gameId, scrollToBottom]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !text.trim()) return;

    try {
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

      // For now, just clear the text since we don't have a sendChatMessage method
      // In a real implementation, you would call an API endpoint to send the message
      console.log('Game chat message would be sent:', { text, userName, gameId });
      setText('');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      console.error('Error sending message:', errorMessage);
      alert(errorMessage);
    }
  };

  const themeConfig = {
    blue: {
      gradient: 'from-purple-500/20 to-pink-500/20',
      border: 'border-purple-400/30',
      avatar: 'from-purple-500 to-pink-500',
      focus: 'focus:ring-purple-500 focus:ring-opacity-50 ',
      button: 'from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
      shadow: 'shadow-purple-500 shadow-opacity-25',
      loading: 'border-purple-500',
      bgGradient: 'from-purple-900/20 to-pink-900/20'
    },
    green: {
      gradient: 'from-green-500/20 to-emerald-500/20',
      border: 'border-green-400/30',
      avatar: 'from-green-500 to-emerald-500',
      focus: 'focus:ring-green-500 focus:ring-opacity-50 focus:border-green-400',
      button: 'from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600',
      shadow: 'shadow-green-500 shadow-opacity-25',
      loading: 'border-green-500',
      bgGradient: 'from-green-900/20 to-emerald-900/20'
    }
  };

  const config = themeConfig[theme];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">{icon} {title}</h2>
        <p className="text-purple-200">{description}</p>
        <div className="mt-2 text-sm text-green-300 bg-green-500/20 px-3 py-1 rounded-full inline-block">
          🔒 Private Game Chat
        </div>
      </div>

      {/* Chat Messages */}
      <div className="space-y-4">
        <div className={`bg-gradient-to-br ${config.bgGradient} rounded-2xl p-4 border border-white/20`}>
          <div
            ref={chatContainerRef}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-4 h-80 sm:h-96 overflow-y-auto shadow-inner border border-white/20 scroll-smooth"
          >
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-4xl mb-3">{icon}</div>
                  <p className="text-purple-200 text-lg">No messages yet</p>
                  <p className="text-purple-300 text-sm">Start chatting with your opponent!</p>
                </div>
              </div>
            ) : (
              <ul className="space-y-3">
                {messages.map((message, i) => (
                  <li key={message.id || i} className={`mb-3 p-4 bg-gradient-to-r ${config.gradient} rounded-2xl ${config.border} shadow-sm`}>
                    <div className="flex items-start space-x-3">
                      <div className={`w-8 h-8 bg-gradient-to-r ${config.avatar} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white font-semibold text-sm">👤</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-purple-300 font-semibold text-sm">{message.userName}</span>
                          <span className="text-purple-400 text-xs">•</span>
                          <span className="text-purple-400 text-xs">{message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : new Date(message.id).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-white text-lg leading-relaxed">{message.message}</p>
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
              disabled={!isConnected}
            />
            <button
              type="submit"
              disabled={!isConnected || !text.trim()}
              className={`bg-gradient-to-r ${config.button} text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg ${config.shadow} disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2`}
            >
              <span>📤</span>
              <span>Send</span>
            </button>
          </div>
        </form>
      </div>

      {/* Connection Status */}
      <div className="text-center">
        <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${isConnected
            ? 'bg-green-500/20 text-green-300 border border-green-400/30'
            : 'bg-red-500/20 text-red-300 border border-red-400/30'
          }`}>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
          <span className="font-medium">
            {isConnected ? 'Connected to game chat' : 'Disconnected from game chat'}
          </span>
        </div>
      </div>
    </div>
  );
} 