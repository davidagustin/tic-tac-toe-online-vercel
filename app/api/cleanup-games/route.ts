import { deleteGame, getAllGames, setGame } from '@/lib/game-storage';
import { pusherServer } from '@/lib/pusher';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Starting manual game cleanup...');

    const body = await request.json();
    const { action, username } = body;

    let cleanedGames = 0;
    let updatedGames = 0;

    if (action === 'cleanup-orphaned') {
      // Clean up games with no active players or very old games
      const allGames = await getAllGames();
      const now = Date.now();
      const thirtyMinutesAgo = now - (30 * 60 * 1000); // 30 minutes

      for (const game of allGames) {
        const gameCreatedAt = new Date(game.createdAt).getTime();
        const isOld = gameCreatedAt < thirtyMinutesAgo;
        const hasNoPlayers = game.players.length === 0;
        const isWaitingTooLong = game.status === 'waiting' && gameCreatedAt < (now - 15 * 60 * 1000); // 15 minutes
        const isFinishedOld = game.status === 'finished' && gameCreatedAt < (now - 5 * 60 * 1000); // 5 minutes

        if (isOld || hasNoPlayers || isWaitingTooLong || isFinishedOld) {
          console.log(`🧹 Cleaning up game: ${game.id} (${game.name}) - Status: ${game.status}, Players: ${game.players.length}, Age: ${Math.round((now - gameCreatedAt) / 60000)}min`);
          await deleteGame(game.id);
          cleanedGames++;

          // Notify lobby about game removal
          if (pusherServer) {
            await pusherServer.trigger('lobby', 'game-removed', { gameId: game.id });
          }
        }
      }
    } else if (action === 'remove-user' && username) {
      // Remove specific user from all games
      const allGames = await getAllGames();

      for (const game of allGames) {
        if (game.players.includes(username)) {
          console.log(`🧹 Removing user ${username} from game ${game.id}`);

          const updatedGame = {
            ...game,
            players: game.players.filter((player: string) => player !== username)
          };

          if (updatedGame.players.length === 0) {
            // No players left, delete the game
            await deleteGame(game.id);
            cleanedGames++;

            // Notify lobby about game removal
            if (pusherServer) {
              await pusherServer.trigger('lobby', 'game-removed', { gameId: game.id });
            }
          } else {
            // Update game with remaining players
            await setGame(game.id, updatedGame);
            updatedGames++;

            // Notify lobby about game update
            if (pusherServer) {
              await pusherServer.trigger('lobby', 'game-updated', { game: updatedGame });
            }
          }
        }
      }
    } else if (action === 'cleanup-all') {
      // Aggressive cleanup - remove all games older than 10 minutes
      const allGames = await getAllGames();
      const now = Date.now();
      const tenMinutesAgo = now - (10 * 60 * 1000);

      for (const game of allGames) {
        const gameCreatedAt = new Date(game.createdAt).getTime();

        if (gameCreatedAt < tenMinutesAgo) {
          console.log(`🧹 Aggressive cleanup - removing game: ${game.id} (${game.name})`);
          await deleteGame(game.id);
          cleanedGames++;

          // Notify lobby about game removal
          if (pusherServer) {
            await pusherServer.trigger('lobby', 'game-removed', { gameId: game.id });
          }
        }
      }
    }

    // Get updated game list
    const remainingGames = await getAllGames();

    console.log(`✅ Cleanup completed: ${cleanedGames} games deleted, ${updatedGames} games updated, ${remainingGames.length} games remaining`);

    return NextResponse.json({
      success: true,
      message: 'Game cleanup completed',
      cleanedGames,
      updatedGames,
      remainingGames: remainingGames.length,
      games: remainingGames,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error during game cleanup:', error);
    return NextResponse.json({
      error: 'Cleanup failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 