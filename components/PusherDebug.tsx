'use client';

import { useEffect, useState } from 'react';

export function PusherDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    // Fetch config from server
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/pusher-config');
        const config = await response.json();
        
        setDebugInfo({
          pusherKey: config.key ? 'Set' : 'Not set',
          pusherCluster: config.cluster || 'Not set',
          keyLength: config.key?.length || 0,
          clusterLength: config.cluster?.length || 0,
          actualKey: config.key ? `${config.key.substring(0, 8)}...` : 'Not set',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        setDebugInfo({
          error: 'Failed to fetch config',
          timestamp: new Date().toISOString(),
        });
      }
    };

    fetchConfig();
  }, []);

  if (!debugInfo) return null;

  // Only show in development
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs max-w-xs">
        <h3 className="font-bold mb-2">Pusher Debug Info</h3>
        <pre className="whitespace-pre-wrap">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>
    );
  }
  
  return null;
} 