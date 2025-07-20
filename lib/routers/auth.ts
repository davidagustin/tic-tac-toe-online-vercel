import { AuthService } from '../auth';
import { authSchema, createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc';

export const authRouter = createTRPCRouter({
    // Register new user
    register: publicProcedure
        .input(authSchema)
        .mutation(async ({ input }) => {
            try {
                const { username, password } = input;

                // Check if user already exists
                const existingUser = await AuthService.getUserByUsername(username);
                if (existingUser) {
                    throw new Error('Username already exists');
                }

                // Create new user
                const user = await AuthService.createUser(username, password);

                return {
                    success: true,
                    user: {
                        id: user.id,
                        username: user.username,
                        created_at: user.created_at,
                    },
                };
            } catch (error) {
                throw new Error(error instanceof Error ? error.message : 'Registration failed');
            }
        }),

    // Login user
    login: publicProcedure
        .input(authSchema)
        .mutation(async ({ input, ctx }) => {
            try {
                const { username, password } = input;

                // Validate credentials
                const user = await AuthService.validateCredentials(username, password);
                if (!user) {
                    throw new Error('Invalid username or password');
                }

                // Set session cookie
                if (ctx.res) {
                    ctx.res.setHeader('Set-Cookie', [
                        `username=${username}; Path=/; HttpOnly; SameSite=Strict`,
                        `session=${user.id}; Path=/; HttpOnly; SameSite=Strict`,
                    ]);
                }

                return {
                    success: true,
                    user: {
                        id: user.id,
                        username: user.username,
                        created_at: user.created_at,
                    },
                };
            } catch (error) {
                throw new Error(error instanceof Error ? error.message : 'Login failed');
            }
        }),

    // Logout user
    logout: protectedProcedure
        .mutation(async ({ ctx }) => {
            try {
                // Clear session cookies
                if (ctx.res) {
                    ctx.res.setHeader('Set-Cookie', [
                        'username=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
                        'session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
                    ]);
                }

                return {
                    success: true,
                    message: 'Logged out successfully',
                };
            } catch (error) {
                throw new Error('Logout failed');
            }
        }),

    // Get current user
    me: protectedProcedure
        .query(async ({ ctx }) => {
            return {
                user: {
                    id: ctx.user.id,
                    username: ctx.user.username,
                    created_at: ctx.user.created_at,
                },
            };
        }),

    // Get user stats
    stats: protectedProcedure
        .query(async ({ ctx }) => {
            try {
                // This would typically fetch from a stats table
                // For now, return mock data
                return {
                    totalGames: 0,
                    gamesWon: 0,
                    winRate: 0,
                };
            } catch (error) {
                throw new Error('Failed to fetch stats');
            }
        }),
}); 