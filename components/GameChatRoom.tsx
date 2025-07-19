'use client';

import React from 'react';
import ChatRoom from './ChatRoom';

interface GameChatRoomProps {
  userName: string;
}

export default function GameChatRoom({ userName }: GameChatRoomProps) {
  return (
    <ChatRoom
      userName={userName}
      title="Game Chat"
      description="Chat with players during the game"
      theme="green"
      icon="💬"
    />
  );
} 