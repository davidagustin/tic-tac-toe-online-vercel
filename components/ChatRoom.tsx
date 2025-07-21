'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTrpcGame } from '@/hooks/useTrpcGame';

interface Message {
  id: string;
  username: string;
  message: string;
  timestamp: string;
}

interface ChatRoomProps {
  userName: string;
  title?: string;
  description?: string;
  theme?: 'default' | 'game' | 'lobby';
  icon?: string;
}

export default function ChatRoom({ userName, title = 'Global Chat', description = 'Chat with other players', theme = 'default', icon = '💬' }: ChatRoomProps) {
  const { isConnected, chatMessages, refreshChatMessages, isRefreshing } = useTrpcGame();
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

  // Manual refresh function
  const handleRefresh = useCallback(async () => {
    console.log('🔄 Manual chat refresh triggered');
    await refreshChatMessages();
  }, [refreshChatMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !isChatAvailable) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text.trim(),
          userName: userName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Add message to local state immediately for better UX
      const newMessage: Message = {
        id: `local_${Date.now()}`,
        username: userName,
        message: text.trim(),
        timestamp: new Date().toISOString(),
      };

      if (!isConnected) {
        setLocalMessages(prev => [...prev, newMessage]);
      }

      setText('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
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
            disabled={isRefreshing || !isChatAvailable}
            className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-medium transition-colors ${
              isRefreshing || !isChatAvailable
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
        {displayMessages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-purple-200 text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          displayMessages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col space-y-1 ${
                message.username === userName ? 'items-end' : 'items-start'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-xs text-purple-300 font-medium">
                  {message.username}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div
                className={`max-w-xs sm:max-w-md px-3 py-2 rounded-lg text-sm ${
                  message.username === userName
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
          isChatAvailable
            ? 'bg-green-500/20 text-green-300 border border-green-400/30'
            : 'bg-red-500/20 text-red-300 border border-red-400/30'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${isChatAvailable ? 'bg-green-400' : 'bg-red-400'}`}></div>
          {isChatAvailable ? 'Chat Connected' : 'Chat Disconnected'}
        </div>
      </div>

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
        <div className="flex space-x-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isChatAvailable ? "Type your message..." : "Chat unavailable"}
            disabled={!isChatAvailable || isLoading}
            className={`flex-1 px-3 py-2 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 ${themeClasses.input} ${
              !isChatAvailable ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          />
          <button
            type="submit"
            disabled={!isChatAvailable || isLoading || !text.trim()}
            className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${themeClasses.button} ${
              !isChatAvailable || isLoading || !text.trim() ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
} 