'use client';

import { useEffect, useState } from 'react';
import PusherClient from 'pusher-js';

export function PusherTest() {
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  const testPusherConnection = async () => {
    setIsTesting(true);
    try {
      // Fetch config from server
      const response = await fetch('/api/pusher-config');
      const config = await response.json();
      
      console.log('Testing Pusher connection with config:', {
        key: config.key ? `${config.key.substring(0, 8)}...` : 'Not set',
        cluster: config.cluster,
      });

      // Create a new Pusher client for testing
      const testPusher = new PusherClient(config.key, {
        cluster: config.cluster,
        forceTLS: true,
        enabledTransports: ['ws', 'wss'], // Force WebSocket
      });

      // Set up connection event handlers
      testPusher.connection.bind('connecting', () => {
        console.log('Test Pusher: Connecting...');
      });

      testPusher.connection.bind('connected', () => {
        console.log('Test Pusher: Connected successfully!');
        setTestResult({
          success: true,
          message: 'Pusher connection successful',
          timestamp: new Date().toISOString(),
        });
        testPusher.disconnect();
      });

      testPusher.connection.bind('disconnected', () => {
        console.log('Test Pusher: Disconnected');
      });

      testPusher.connection.bind('error', (error: any) => {
        console.error('Test Pusher: Connection error:', error);
        setTestResult({
          success: false,
          error: error.message || 'Connection failed',
          details: error,
          timestamp: new Date().toISOString(),
        });
      });

      // Test server connection
      const serverTest = await fetch('/api/test-pusher-connection');
      const serverResult = await serverTest.json();
      
      console.log('Server test result:', serverResult);

    } catch (error) {
      console.error('Test failed:', error);
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Test failed',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed top-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs max-w-xs">
      <h3 className="font-bold mb-2">Pusher Connection Test</h3>
      <button
        onClick={testPusherConnection}
        disabled={isTesting}
        className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs mb-2 disabled:opacity-50"
      >
        {isTesting ? 'Testing...' : 'Test Connection'}
      </button>
      {testResult && (
        <pre className="whitespace-pre-wrap text-xs">
          {JSON.stringify(testResult, null, 2)}
        </pre>
      )}
    </div>
  );
} 