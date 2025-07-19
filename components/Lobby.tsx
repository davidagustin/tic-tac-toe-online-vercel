'use client';

import React from 'react';
import ChatRoom from './ChatRoom';

interface LobbyProps {
  userName: string;
}

export default function Lobby({ userName }: LobbyProps) {
  return (
    <ChatRoom
      userName={userName}
      title="Game Lobby"
      description="Chat with other players before starting a game"
      theme="blue"
      icon="🏠"
    />
  );
} 