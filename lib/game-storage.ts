// Shared in-memory storage for games (in production, you'd use a database)
export const games = new Map();

export interface Game {
  id: string;
  name: string;
  players: string[];
  status: 'waiting' | 'playing' | 'finished';
  createdBy: string;
  createdAt: Date;
  board: (string | null)[];
  currentPlayer: 'X' | 'O' | null;
  winner: string | null;
}

export function getGame(gameId: string): Game | undefined {
  return games.get(gameId);
}

export function setGame(gameId: string, game: Game): void {
  games.set(gameId, game);
}

export function deleteGame(gameId: string): boolean {
  return games.delete(gameId);
}

export function getAllGames(): Game[] {
  // Clean up old games before returning the list
  cleanupOldGames();
  return Array.from(games.values());
}

// Clean up games older than 1 hour or finished games older than 10 minutes
export function cleanupOldGames(): void {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const gamesToDelete: string[] = [];
  
  for (const [gameId, game] of games.entries()) {
    const gameCreatedAt = new Date(game.createdAt);
    
    // Delete games older than 1 hour
    if (gameCreatedAt < oneHourAgo) {
      gamesToDelete.push(gameId);
    }
    // Delete finished games older than 10 minutes
    else if (game.status === 'finished' && gameCreatedAt < tenMinutesAgo) {
      gamesToDelete.push(gameId);
    }
  }
  
  for (const gameId of gamesToDelete) {
    games.delete(gameId);
    console.log(`🧹 Cleaned up old game: ${gameId}`);
  }
  
  if (gamesToDelete.length > 0) {
    console.log(`🧹 Cleaned up ${gamesToDelete.length} old games`);
  }
}

// Cleanup games with inactive users (users who haven't been active for 5 minutes)
export function cleanupInactiveUsers(): void {
  const now = Date.now();
  const fiveMinutesAgo = now - (5 * 60 * 1000);
  
  const gamesToUpdate: { gameId: string; updatedGame: Game }[] = [];
  const gamesToDelete: string[] = [];
  
  for (const [gameId, game] of games.entries()) {
    // Check if any players have been inactive
    // For now, we'll assume all players are active
    // In a real implementation, you'd track last activity time per player
    const activePlayers = game.players.filter((player: string) => {
      // TODO: Implement player activity tracking
      return true;
    });
    
    if (activePlayers.length === 0) {
      // No active players, delete the game
      gamesToDelete.push(gameId);
    } else if (activePlayers.length !== game.players.length) {
      // Some players are inactive, update the game
      const updatedGame = {
        ...game,
        players: activePlayers
      };
      gamesToUpdate.push({ gameId, updatedGame });
    }
  }
  
  // Apply updates
  for (const { gameId, updatedGame } of gamesToUpdate) {
    console.log(`🧹 Removing inactive users from game: ${gameId}`);
    games.set(gameId, updatedGame);
  }
  
  for (const gameId of gamesToDelete) {
    console.log(`🧹 Deleting game with no active users: ${gameId}`);
    games.delete(gameId);
  }
  
  if (gamesToUpdate.length > 0 || gamesToDelete.length > 0) {
    console.log(`🧹 Cleaned up ${gamesToUpdate.length} games with inactive users, deleted ${gamesToDelete.length} empty games`);
  }
} 