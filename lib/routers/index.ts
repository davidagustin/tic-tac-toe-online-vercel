import { createTRPCRouter } from '../trpc';
import { authRouter } from './auth';
import { chatRouter } from './chat';
import { gameRouter } from './game';

export const appRouter = createTRPCRouter({
    auth: authRouter,
    game: gameRouter,
    chat: chatRouter,
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter; 