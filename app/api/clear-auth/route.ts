import { deleteGame, setGame } from '@/lib/game-storage';
import { pusherServer } from '@/lib/pusher';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    let body;
    let username;
    let action;

    // Handle empty or invalid JSON
    try {
      const text = await request.text();
      if (text.trim()) {
        body = JSON.parse(text);
        username = body.username;
        action = body.action;
      } else {
        console.log('⚠️ Clear-auth: Empty request body, treating as general cleanup');
        // This could be a general cleanup call
        username = null;
        action = 'general_cleanup';
      }
    } catch (parseError) {
      console.log('⚠️ Clear-auth: Failed to parse JSON, treating as general cleanup:', parseError);
      username = null;
      action = 'general_cleanup';
    }

    if (action === 'signout' && username) {
      console.log(`🧹 User ${username} signed out - cleaning up games...`);

      // Get all games and find ones with this user
      const { getAllGames } = await import('@/lib/game-storage');
      const allGames = getAllGames();

      for (const game of allGames) {
        if (game.players.includes(username)) {
          console.log(`🧹 Removing ${username} from game ${game.id}`);

          // Remove user from game
          const updatedGame = {
            ...game,
            players: game.players.filter(player => player !== username)
          };

          // If no players left, delete the game
          if (updatedGame.players.length === 0) {
            console.log(`🧹 Deleting empty game ${game.id}`);
            deleteGame(game.id);

            // Notify lobby about game removal
            if (pusherServer) {
              await pusherServer.trigger('lobby', 'game-removed', { gameId: game.id });
            }
          } else {
            // Update game with remaining players
            setGame(game.id, updatedGame);

            // Notify lobby about game update
            if (pusherServer) {
              await pusherServer.trigger('lobby', 'game-updated', { game: updatedGame });
            }
          }
        }
      }

      console.log(`✅ Cleanup completed for ${username}`);
    } else if (action === 'general_cleanup') {
      console.log('🧹 Performing general cleanup...');
      // Could implement general cleanup logic here if needed
    }

    return NextResponse.json({
      message: 'Auth cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in clear-auth:', error);
    return NextResponse.json({
      error: 'Failed to clear auth',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Auth clear endpoint is working',
    timestamp: new Date().toISOString()
  });
} 