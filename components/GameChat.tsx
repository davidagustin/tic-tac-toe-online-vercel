'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTrpcGame } from '@/hooks/useTrpcGame';

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
  title?: string;
  description?: string;
  theme?: 'default' | 'game' | 'lobby';
  icon?: string;
}

export default function GameChat({ userName, gameId, title = 'Game Chat', description = 'Chat with your opponent', theme = 'game', icon = '🎮' }: GameChatProps) {
  const { isConnected, chatMessages, refreshChatMessages, isRefreshing } = useTrpcGame();
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

  // Manual refresh function
  const handleRefresh = useCallback(async () => {
    console.log('🔄 Manual game chat refresh triggered');
    await refreshChatMessages(gameId);
  }, [refreshChatMessages, gameId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !isConnected) return;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text.trim(),
          userName: userName,
          gameId: gameId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setText('');
      
      // Refresh chat messages after sending
      await refreshChatMessages(gameId);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const getThemeClasses = () => {
    switch (theme) {
      case 'game':
        return {
          container: 'bg-purple-900/50 border-purple-500/30',
          header: 'bg-purple-800/50',
          input: 'bg-purple-800/30 border-purple-500/50 focus:border-purple-400',
          button: 'bg-purple-600 hover:bg-purple-700'
        };
      case 'lobby':
        return {
          container: 'bg-blue-900/50 border-blue-500/30',
          header: 'bg-blue-800/50',
          input: 'bg-blue-800/30 border-blue-500/50 focus:border-blue-400',
          button: 'bg-blue-600 hover:bg-blue-700'
        };
      default:
        return {
          container: 'bg-white/10 border-white/20',
          header: 'bg-white/5',
          input: 'bg-white/10 border-white/20 focus:border-white/40',
          button: 'bg-purple-600 hover:bg-purple-700'
        };
    }
  };

  const themeClasses = getThemeClasses();

  return (
    <div className={`card ${themeClasses.container} border backdrop-blur-lg`}>
      {/* Header with Refresh Button */}
      <div className={`${themeClasses.header} rounded-t-lg p-4 border-b border-white/10`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{icon}</span>
            <div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="text-sm text-purple-200">{description}</p>
            </div>
          </div>
          
          {/* Manual Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || !isConnected}
            className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-medium transition-colors ${
              isRefreshing || !isConnected
                ? 'opacity-50 cursor-not-allowed bg-gray-600'
                : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
          >
            {isRefreshing ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                Refreshing...
              </>
            ) : (
              <>
                <span>🔄</span>
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div 
        ref={chatContainerRef}
        className="h-64 overflow-y-auto p-4 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🎮</div>
            <p className="text-purple-200 text-sm">No messages yet. Start chatting with your opponent!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col space-y-1 ${
                message.userName === userName ? 'items-end' : 'items-start'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-xs text-purple-300 font-medium">
                  {message.userName}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div
                className={`max-w-xs sm:max-w-md px-3 py-2 rounded-lg text-sm ${
                  message.userName === userName
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-white'
                }`}
              >
                {message.message}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Connection Status */}
      <div className="px-4 py-2 border-t border-white/10">
        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          isConnected
            ? 'bg-green-500/20 text-green-300 border border-green-400/30'
            : 'bg-red-500/20 text-red-300 border border-red-400/30'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          {isConnected ? 'Game Chat Connected' : 'Game Chat Disconnected'}
        </div>
      </div>

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
        <div className="flex space-x-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isConnected ? "Type your message..." : "Chat unavailable"}
            disabled={!isConnected}
            className={`flex-1 px-3 py-2 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 ${themeClasses.input} ${
              !isConnected ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          />
          <button
            type="submit"
            disabled={!isConnected || !text.trim()}
            className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${themeClasses.button} ${
              !isConnected || !text.trim() ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
} 