'use client';

import { useEffect, useState } from 'react';

export function PusherDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    // Get environment variables
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    
    setDebugInfo({
      pusherKey: pusherKey ? 'Set' : 'Not set',
      pusherCluster: pusherCluster || 'Not set',
      keyLength: pusherKey?.length || 0,
      clusterLength: pusherCluster?.length || 0,
      timestamp: new Date().toISOString(),
    });
  }, []);

  if (!debugInfo) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs max-w-xs">
      <h3 className="font-bold mb-2">Pusher Debug Info</h3>
      <pre className="whitespace-pre-wrap">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
} 