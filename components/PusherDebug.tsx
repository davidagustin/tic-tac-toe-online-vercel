'use client';

import { useState } from 'react';

interface PusherDebugProps {
  isConnected: boolean;
  isInitializing: boolean;
  lastError: string | null;
}

export function PusherDebug({ isConnected, isInitializing, lastError }: PusherDebugProps) {
  const [showDetails, setShowDetails] = useState(false);

  const handleErrorClick = () => {
    if (lastError) {
      console.error('Pusher Debug Error Details:', lastError);
      alert(`Error: ${lastError}`);
    }
  };

  // Only show in development
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs max-w-xs">
        <h3 className="font-bold mb-2">Pusher Debug Info</h3>
        <div className="space-y-1">
          <div>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
          <div>Initializing: {isInitializing ? 'Yes' : 'No'}</div>
          {lastError && (
            <div className="text-red-300 cursor-pointer" onClick={handleErrorClick}>
              Error: {lastError.substring(0, 50)}...
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return null;
} 