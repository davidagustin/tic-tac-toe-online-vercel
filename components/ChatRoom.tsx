'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';
import axios from 'axios';

interface Message {
  id: number;
  text: string;
}

interface ChatRoomProps {
  userName: string;
  title: string;
  description: string;
  theme: 'blue' | 'green';
  icon: string;
}

export default function ChatRoom({ userName, title, description, theme, icon }: ChatRoomProps) {
  const { socket, isConnected } = useSocket();
  const [text, setText] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/mvp');
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleChatRoom = () => {
      getMessages();
    };

    socket.on('chat room', handleChatRoom);
    getMessages();

    return () => {
      socket.off('chat room', handleChatRoom);
    };
  }, [socket, getMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !text.trim()) return;

    try {
      socket.emit('chat room', { text });
      await axios.post('/api/mvp', { body: text, userName });
      setText('');
    } catch (error) {
      console.error('Error posting message:', error);
    }
  };

  const themeConfig = {
    blue: {
      gradient: 'from-blue-50 to-indigo-50',
      border: 'border-blue-100',
      avatar: 'from-blue-500 to-indigo-600',
      focus: 'focus:ring-blue-500/20 focus:border-blue-500',
      button: 'from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700',
      shadow: 'shadow-blue-500/25',
      loading: 'border-blue-500',
      bgGradient: 'from-gray-50 to-blue-50'
    },
    green: {
      gradient: 'from-green-50 to-emerald-50',
      border: 'border-green-100',
      avatar: 'from-green-500 to-emerald-600',
      focus: 'focus:ring-green-500/20 focus:border-green-500',
      button: 'from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700',
      shadow: 'shadow-green-500/25',
      loading: 'border-green-500',
      bgGradient: 'from-gray-50 to-green-50'
    }
  };

  const config = themeConfig[theme];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">{icon} {title}</h2>
        <p className="text-gray-600">{description}</p>
      </div>

      {/* Chat Messages */}
      <div className="space-y-4">
        <div className={`bg-gradient-to-br ${config.bgGradient} rounded-2xl p-4 border border-gray-200`}>
          <div className="bg-white rounded-xl p-4 h-80 sm:h-96 overflow-y-auto shadow-inner border border-gray-100">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${config.loading} mx-auto mb-2`}></div>
                  <p className="text-gray-500">Loading messages...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-4xl mb-3">{icon}</div>
                  <p className="text-gray-500 text-lg">No messages yet</p>
                  <p className="text-gray-400 text-sm">Start the conversation!</p>
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
                        <p className="text-gray-800 text-lg leading-relaxed">{message.text}</p>
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
        <h3 className="text-xl font-semibold text-gray-800 text-center">💭 Send Message</h3>
        <form onSubmit={handleSubmit} className="space-y-4" suppressHydrationWarning>
          <div className="flex space-x-3">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={`flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 ${config.focus} bg-white text-gray-900 placeholder-gray-400 text-lg transition-all duration-200`}
              placeholder="Type your message..."
              disabled={!isConnected}
            />
            <button
              type="submit"
              disabled={!isConnected || !text.trim()}
              className={`bg-gradient-to-r ${config.button} disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg ${config.shadow} disabled:transform-none disabled:shadow-none`}
            >
              📤 Send
            </button>
          </div>
        </form>
        
        {/* Connection Status */}
        {!isConnected && (
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-red-100 text-red-800 px-4 py-2 rounded-full border border-red-200">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm font-medium">
                Socket not connected. Chat may not work properly.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 