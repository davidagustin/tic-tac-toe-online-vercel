# Ably Integration Guide

This document explains how to integrate Ably real-time messaging into your Next.js Tic-Tac-Toe application.

## Overview

Ably is a real-time messaging platform that provides reliable, scalable real-time communication. This integration replaces Pusher with Ably for better stability and performance.

## Features

- ✅ Real-time game updates
- ✅ Live chat functionality
- ✅ Connection stability with heartbeat
- ✅ Rate limiting to prevent disconnections
- ✅ Automatic reconnection
- ✅ Channel management with caching
- ✅ Comprehensive error handling

## Setup Instructions

### 1. Install Ably SDK

```bash
npm install ably
```

### 2. Get Your Ably API Key

1. Visit [Ably Dashboard](https://ably.com/accounts/any/apps/any/keys)
2. Create a new app or use an existing one
3. Copy your API key (format: `VR3MuQ.KvwwJA:your_secret_here`)

### 3. Configure Environment Variables

Add your Ably API key to `.env.local`:

```env
ABLY_API_KEY=VR3MuQ.KvwwJA:your_secret_here
```

### 4. Run the Setup Script

```bash
node scripts/setup-ably.js
```

This will automatically add the Ably configuration to your `.env.local` file.

## Architecture

### Server-Side (API Routes)

- **`lib/ably.ts`**: Server-side Ably configuration and utilities
- **`app/api/ably-config/route.ts`**: API endpoint to securely provide Ably config to clients
- **`app/api/health-check/route.ts`**: Health check endpoint that includes Ably status

### Client-Side (React Components)

- **`hooks/useAbly.ts`**: Custom React hook for Ably connection management
- **`components/AblyExample.tsx`**: Example component demonstrating Ably usage
- **`app/ably-test/page.tsx`**: Test page to verify Ably integration

## Key Components

### 1. Ably Configuration (`lib/ably.ts`)

```typescript
// Server-side Ably instance
export const ablyServer = new Ably.Rest(process.env.ABLY_API_KEY);

// Client-side initialization
export async function initializeAblyClient(): Promise<Ably.Realtime> {
  const config = await fetch('/api/ably-config');
  return new Ably.Realtime(config.key);
}
```

### 2. React Hook (`hooks/useAbly.ts`)

```typescript
export function useAbly() {
  const [ably, setAbly] = useState<Ably.Realtime | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Connection management
  const connect = useCallback(async () => {
    // Initialize connection with error handling
  }, []);
  
  // Channel subscriptions
  const subscribeToLobby = useCallback(() => {
    // Subscribe to lobby channel with rate limiting
  }, []);
  
  return {
    ably,
    isConnected,
    connect,
    subscribeToLobby,
    // ... other methods
  };
}
```

### 3. Channel Management

```typescript
// Channel names with validation
export const CHANNELS = {
  LOBBY: 'lobby',
  GAME: (gameId: string) => `game-${gameId}`,
  USER: (userId: string) => `user-${userId}`,
};

// Event names
export const EVENTS = {
  GAME_CREATED: 'game-created',
  GAME_UPDATED: 'game-updated',
  PLAYER_MOVED: 'player-moved',
  CHAT_MESSAGE: 'chat-message',
  // ... other events
};
```

## Stability Features

### 1. Heartbeat System

```typescript
const startHeartbeat = useCallback(() => {
  setInterval(() => {
    if (ably?.connection.state === 'connected') {
      const channel = ably.channels.get('heartbeat');
      channel.publish('ping', { timestamp: Date.now() });
    }
  }, 25000); // 25 seconds
}, [ably]);
```

### 2. Rate Limiting

```typescript
function checkRateLimit(action: string, limit: number = 10, window: number = 60000): boolean {
  // Prevents excessive API calls that could cause disconnections
}
```

### 3. Connection Recovery

```typescript
ably.connection.on('failed', (error) => {
  // Handle connection failures with retry logic
});

ably.connection.on('suspended', () => {
  // Handle connection suspension
});
```

### 4. Channel Caching

```typescript
const channelCache = new Map<string, Ably.Types.RealtimeChannelPromise>();

export function subscribeToChannel(ably: Ably.Realtime, channelName: string) {
  if (channelCache.has(channelName)) {
    return channelCache.get(channelName)!;
  }
  // Create and cache new channel
}
```

## Testing

### 1. Test Ably Connection

```bash
node scripts/test-ably.js
```

### 2. Test in Browser

Visit `/ably-test` to see a live demo of the Ably integration.

### 3. Health Check

```bash
curl http://localhost:3000/api/health-check
```

## Migration from Pusher

### 1. Replace Imports

```typescript
// Old (Pusher)
import { pusherServer } from '@/lib/pusher';
import { usePusher } from '@/hooks/usePusher';

// New (Ably)
import { ablyServer } from '@/lib/ably';
import { useAbly } from '@/hooks/useAbly';
```

### 2. Update Channel Names

```typescript
// Old (Pusher)
const channel = pusher.subscribe('game-123');

// New (Ably)
const channel = ably.channels.get('game-123');
```

### 3. Update Event Handling

```typescript
// Old (Pusher)
channel.bind('game-updated', (data) => {
  // Handle event
});

// New (Ably)
channel.subscribe('game-updated', (message) => {
  // Handle event
  console.log(message.data);
});
```

## Error Handling

### Common Errors

1. **40101 - Invalid API Key**
   - Check your `ABLY_API_KEY` in `.env.local`
   - Ensure the key is complete and valid

2. **Connection Timeout**
   - Check network connectivity
   - Verify Ably service status

3. **Rate Limit Exceeded**
   - Implement proper rate limiting
   - Add delays between rapid events

### Debugging

```typescript
// Enable detailed logging
ably.connection.on('connected', () => {
  console.log('✅ Ably connected');
});

ably.connection.on('failed', (error) => {
  console.error('❌ Ably failed:', error);
});
```

## Performance Optimization

### 1. Channel Cleanup

```typescript
// Always unsubscribe from channels when leaving
const leaveGame = useCallback(() => {
  if (gameChannel.current) {
    unsubscribeFromChannel(ably, channelName);
    gameChannel.current = null;
  }
}, [ably, currentGame?.id]);
```

### 2. Connection Pooling

```typescript
// Reuse connections when possible
let ablyClient: Ably.Realtime | null = null;

export function getAblyClient(): Ably.Realtime | null {
  return ablyClient;
}
```

### 3. Message Batching

```typescript
// Batch multiple updates into single messages
const batchUpdate = debounce((updates) => {
  channel.publish('batch-update', updates);
}, 100);
```

## Security Considerations

### 1. API Key Protection

- Never expose API keys in client-side code
- Use server-side endpoints to provide configuration
- Implement proper authentication for sensitive operations

### 2. Channel Authorization

```typescript
// Implement channel-level authorization
const channel = ably.channels.get('game-123', {
  params: { authToken: userToken }
});
```

### 3. Rate Limiting

```typescript
// Prevent abuse with rate limiting
if (!checkRateLimit('game_join', 5, 60000)) {
  throw new Error('Rate limit exceeded');
}
```

## Monitoring

### 1. Health Checks

Monitor Ably connection status via the health check endpoint:

```bash
curl http://localhost:3000/api/health-check
```

### 2. Connection Metrics

Track connection stability and performance:

```typescript
ably.connection.on('connected', () => {
  // Log successful connections
});

ably.connection.on('failed', (error) => {
  // Log connection failures
});
```

## Troubleshooting

### Connection Issues

1. **Check API Key**: Verify your Ably API key is correct
2. **Network Issues**: Check firewall and proxy settings
3. **Service Status**: Check [Ably Status Page](https://status.ably.io/)

### Performance Issues

1. **Rate Limiting**: Implement proper rate limiting
2. **Channel Cleanup**: Ensure channels are properly unsubscribed
3. **Connection Pooling**: Reuse connections when possible

### Debug Mode

Enable debug logging:

```typescript
const ably = new Ably.Realtime(apiKey, {
  logLevel: 2 // Debug level
});
```

## Resources

- [Ably Documentation](https://ably.com/docs)
- [Ably React Hooks](https://ably.com/docs/getting-started/tutorial#react)
- [Ably API Reference](https://ably.com/docs/api)
- [Ably Status Page](https://status.ably.io/)

## Support

For issues with Ably integration:

1. Check the [Ably Help Center](https://support.ably.io/)
2. Review the [Ably Community Forum](https://community.ably.io/)
3. Contact Ably Support for account-specific issues 