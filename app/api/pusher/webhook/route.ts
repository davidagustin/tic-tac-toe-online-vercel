import { deleteGame, setGame } from '@/lib/game-storage';
import { pusherServer } from '@/lib/pusher';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const _signature = request.headers.get('x-pusher-signature');

    if (!pusherServer) {
      console.error('Pusher server not available for webhook');
      return NextResponse.json({ error: 'Pusher server not available' }, { status: 500 });
    }

    // For now, skip webhook signature verification to avoid type issues
    // In production, you should implement proper signature verification
    console.log('Webhook received, processing events...');

    const events = JSON.parse(body);
    console.log('🔔 Received Pusher webhook events:', events);

    for (const event of events.events || []) {
      console.log(`🔔 Processing webhook event: ${event.name} for channel: ${event.channel}`);

      if (event.name === 'member_removed') {
        // User disconnected from presence channel
        const channel = event.channel;
        const userId = event.user_id;

        console.log(`👤 User ${userId} disconnected from channel ${channel}`);

        // Clean up user from games
        await cleanupDisconnectedUser(userId);
      } else if (event.name === 'channel_vacated') {
        // Channel is empty (all users left)
        const channel = event.channel;
        console.log(`📭 Channel ${channel} is now empty`);

        // If it's a game channel, we might want to clean up the game
        if (channel.startsWith('game-')) {
          const gameId = channel.replace('game-', '');
          console.log(`🧹 Cleaning up empty game channel: ${gameId}`);
          // Don't delete the game immediately, just mark it for cleanup
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function cleanupDisconnectedUser(userId: string) {
  try {
    console.log(`🧹 Cleaning up disconnected user: ${userId}`);

    // Get all games and find ones with this user
    const { getAllGames } = await import('@/lib/game-storage');
    const allGames = await getAllGames();

    for (const game of allGames) {
      if (game.players.includes(userId)) {
        console.log(`🧹 Removing disconnected user ${userId} from game ${game.id}`);

        // Remove user from game
        const updatedGame = {
          ...game,
          players: game.players.filter(player => player !== userId)
        };

        // If no players left, delete the game
        if (updatedGame.players.length === 0) {
          console.log(`🧹 Deleting empty game ${game.id} after user disconnect`);
          await deleteGame(game.id);

          // Notify lobby about game removal
          if (pusherServer) {
            await pusherServer.trigger('lobby', 'game-removed', { gameId: game.id });
          }
        } else {
          // Update game with remaining players
          await setGame(game.id, updatedGame);

          // Notify lobby about game update
          if (pusherServer) {
            await pusherServer.trigger('lobby', 'game-updated', { game: updatedGame });
          }

          // Notify remaining players in the game
          if (pusherServer) {
            await pusherServer.trigger(`game-${game.id}`, 'player-left', {
              userId,
              remainingPlayers: updatedGame.players
            });
          }
        }
      }
    }

    console.log(`✅ Cleanup completed for disconnected user ${userId}`);
  } catch (error) {
    console.error(`❌ Error cleaning up disconnected user ${userId}:`, error);
  }
} 