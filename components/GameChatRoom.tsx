'use client';

import React from 'react';
import GameChat from './GameChat';

interface GameChatRoomProps {
  userName: string;
  gameId: string;
}

export default function GameChatRoom({ userName, gameId }: GameChatRoomProps) {
  return (
    <GameChat
      userName={userName}
      gameId={gameId}
      title="Game Chat"
      description="Private chat with your opponent"
      theme="green"
      icon="💬"
    />
  );
} 