import { z } from 'zod';
import { broadcastGameEvent, createTRPCRouter, gameConnections, games, gameSchema, getGameEvents, moveSchema, protectedProcedure, type GameState } from '../trpc';

// In-memory storage for game statistics
const userStats = new Map<string, { wins: number; losses: number; draws: number }>();

export const gameRouter = createTRPCRouter({
    // Create a new game
    create: protectedProcedure
        .input(gameSchema)
        .mutation(async ({ input, ctx }) => {
            try {
                const { gameName } = input;
                const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                const game: GameState = {
                    id: gameId,
                    name: gameName,
                    board: ['', '', '', '', '', '', '', '', ''],
                    currentPlayer: ctx.user.username,
                    players: [ctx.user.username],
                    status: 'waiting',
                    createdAt: new Date(),
                };

                games.set(gameId, game);

                // Broadcast game created event
                broadcastGameEvent(gameId, {
                    type: 'gameCreated',
                    gameId,
                    data: {
                        game: {
                            id: game.id,
                            name: game.name,
                            board: game.board,
                            currentPlayer: game.currentPlayer,
                            players: game.players,
                            status: game.status,
                            createdAt: game.createdAt,
                        },
                        creator: ctx.user.username,
                    },
                    timestamp: Date.now(),
                    userId: ctx.user.username,
                });

                return {
                    success: true,
                    game: {
                        id: game.id,
                        name: game.name,
                        board: game.board,
                        currentPlayer: game.currentPlayer,
                        players: game.players,
                        status: game.status,
                        createdAt: game.createdAt,
                    },
                };
            } catch (error) {
                throw new Error(error instanceof Error ? error.message : 'Failed to create game');
            }
        }),

    // Join a game
    join: protectedProcedure
        .input(z.object({ gameId: z.string() }))
        .mutation(async ({ input, ctx }) => {
            try {
                const { gameId } = input;
                const game = games.get(gameId);

                if (!game) {
                    throw new Error('Game not found');
                }

                if (game.status !== 'waiting') {
                    throw new Error('Game is not accepting players');
                }

                if (game.players.includes(ctx.user.username)) {
                    throw new Error('Already in this game');
                }

                if (game.players.length >= 2) {
                    throw new Error('Game is full');
                }

                // Add player to game
                game.players.push(ctx.user.username);
                game.status = 'playing';

                // Broadcast player joined event
                broadcastGameEvent(gameId, {
                    type: 'playerJoined',
                    gameId,
                    data: {
                        player: ctx.user.username,
                        players: game.players,
                        status: game.status,
                    },
                    timestamp: Date.now(),
                    userId: ctx.user.username,
                });

                return {
                    success: true,
                    game: {
                        id: game.id,
                        name: game.name,
                        board: game.board,
                        currentPlayer: game.currentPlayer,
                        players: game.players,
                        status: game.status,
                    },
                };
            } catch (error) {
                throw new Error(error instanceof Error ? error.message : 'Failed to join game');
            }
        }),

    // Make a move
    move: protectedProcedure
        .input(moveSchema)
        .mutation(async ({ input, ctx }) => {
            try {
                const { gameId, position } = input;
                const game = games.get(gameId);

                if (!game) {
                    throw new Error('Game not found');
                }

                if (game.status !== 'playing') {
                    throw new Error('Game is not active');
                }

                if (!game.players.includes(ctx.user.username)) {
                    throw new Error('Not a player in this game');
                }

                if (game.currentPlayer !== ctx.user.username) {
                    throw new Error('Not your turn');
                }

                if (game.board[position] !== '') {
                    throw new Error('Position already taken');
                }

                // Make the move
                const symbol = game.players.indexOf(ctx.user.username) === 0 ? 'X' : 'O';
                game.board[position] = symbol;
                game.lastMove = {
                    position,
                    symbol,
                    player: ctx.user.username,
                };

                // Check for winner
                const winner = checkWinner(game.board);
                if (winner) {
                    game.status = 'finished';
                    game.winner = ctx.user.username;

                    // Update statistics
                    updateUserStats(ctx.user.username, 'win');
                    const otherPlayer = game.players.find(p => p !== ctx.user.username);
                    if (otherPlayer) {
                        updateUserStats(otherPlayer, 'loss');
                    }
                } else if (game.board.every(cell => cell !== '')) {
                    game.status = 'finished';
                    game.winner = 'tie';

                    // Update statistics for both players
                    game.players.forEach(player => {
                        updateUserStats(player, 'draw');
                    });
                } else {
                    // Switch turns
                    game.currentPlayer = game.players.find(p => p !== game.currentPlayer) || game.currentPlayer;
                }

                // Broadcast move made event
                broadcastGameEvent(gameId, {
                    type: 'moveMade',
                    gameId,
                    data: {
                        position,
                        symbol,
                        board: game.board,
                        currentPlayer: game.currentPlayer,
                        status: game.status,
                        winner: game.winner,
                        lastMove: game.lastMove,
                    },
                    timestamp: Date.now(),
                    userId: ctx.user.username,
                });

                // If game is finished, broadcast game finished event
                if (game.status === 'finished') {
                    broadcastGameEvent(gameId, {
                        type: 'gameFinished',
                        gameId,
                        data: {
                            winner: game.winner,
                            board: game.board,
                            players: game.players,
                            finalMove: game.lastMove,
                        },
                        timestamp: Date.now(),
                        userId: ctx.user.username,
                    });
                }

                return {
                    success: true,
                    game: {
                        id: game.id,
                        board: game.board,
                        currentPlayer: game.currentPlayer,
                        status: game.status,
                        winner: game.winner,
                        lastMove: game.lastMove,
                    },
                };
            } catch (error) {
                throw new Error(error instanceof Error ? error.message : 'Failed to make move');
            }
        }),

    // Get game state
    getState: protectedProcedure
        .input(z.object({ gameId: z.string() }))
        .query(async ({ input }) => {
            try {
                const { gameId } = input;
                const game = games.get(gameId);

                if (!game) {
                    throw new Error('Game not found');
                }

                return {
                    game: {
                        id: game.id,
                        name: game.name,
                        board: game.board,
                        currentPlayer: game.currentPlayer,
                        players: game.players,
                        status: game.status,
                        winner: game.winner,
                        createdAt: game.createdAt,
                        lastMove: game.lastMove,
                    },
                };
            } catch (error) {
                throw new Error('Failed to get game state');
            }
        }),

    // Get game events (for polling-based real-time updates)
    getEvents: protectedProcedure
        .input(z.object({
            gameId: z.string(),
            since: z.number().optional()
        }))
        .query(async ({ input }) => {
            const { gameId, since } = input;
            const game = games.get(gameId);

            if (!game) {
                throw new Error('Game not found');
            }

            const events = getGameEvents(gameId, since);

            return {
                game,
                events,
                connectionId: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            };
        }),

    // Leave game
    leave: protectedProcedure
        .input(z.object({ gameId: z.string() }))
        .mutation(async ({ input, ctx }) => {
            try {
                const { gameId } = input;
                const game = games.get(gameId);

                if (!game) {
                    throw new Error('Game not found');
                }

                if (!game.players.includes(ctx.user.username)) {
                    throw new Error('Not a player in this game');
                }

                // Remove player from game
                game.players = game.players.filter(p => p !== ctx.user.username);

                // If no players left, delete the game
                if (game.players.length === 0) {
                    games.delete(gameId);
                    gameConnections.delete(gameId);
                } else {
                    // If game was in progress, mark as finished
                    if (game.status === 'playing') {
                        game.status = 'finished';
                        game.winner = 'abandoned';

                        // Update statistics for remaining player
                        const remainingPlayer = game.players[0];
                        updateUserStats(remainingPlayer, 'win');
                        updateUserStats(ctx.user.username, 'loss');
                    }
                }

                // Broadcast player left event
                broadcastGameEvent(gameId, {
                    type: 'playerLeft',
                    gameId,
                    data: {
                        player: ctx.user.username,
                        remainingPlayers: game.players,
                        status: game.status,
                    },
                    timestamp: Date.now(),
                    userId: ctx.user.username,
                });

                return {
                    success: true,
                    message: 'Left game successfully',
                };
            } catch (error) {
                throw new Error(error instanceof Error ? error.message : 'Failed to leave game');
            }
        }),

    // Get user statistics
    getStats: protectedProcedure
        .input(z.object({ username: z.string() }))
        .query(async ({ input }) => {
            const { username } = input;
            const stats = userStats.get(username) || { wins: 0, losses: 0, draws: 0 };

            return {
                username,
                stats,
                totalGames: stats.wins + stats.losses + stats.draws,
            };
        }),

    // List available games
    list: protectedProcedure
        .query(async () => {
            const availableGames = Array.from(games.values())
                .filter(game => game.status === 'waiting')
                .map(game => ({
                    id: game.id,
                    name: game.name,
                    players: game.players,
                    createdAt: game.createdAt,
                }));

            return {
                games: availableGames,
            };
        }),
});

// Helper function to check for winner
function checkWinner(board: string[]): string | null {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
        [0, 4, 8], [2, 4, 6], // diagonals
    ];

    for (const [a, b, c] of lines) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }

    return null;
}

// Helper function to update user statistics
function updateUserStats(username: string, result: 'win' | 'loss' | 'draw') {
    if (!userStats.has(username)) {
        userStats.set(username, { wins: 0, losses: 0, draws: 0 });
    }

    const stats = userStats.get(username)!;
    stats[result === 'win' ? 'wins' : result === 'loss' ? 'losses' : 'draws']++;
}

// Export for WebSocket usage
export { broadcastGameEvent, gameConnections, games, userStats };

