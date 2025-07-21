import { z } from 'zod';
import { chatSchema, createTRPCRouter, protectedProcedure } from '../trpc';

// Chat message interface
interface ChatMessage {
    id: string;
    username: string;
    message: string;
    gameId?: string;
    timestamp: Date;
}

// In-memory chat storage (in production, use database)
const chatMessages = new Map<string, ChatMessage[]>(); // gameId -> messages
const globalMessages: ChatMessage[] = [];

export const chatRouter = createTRPCRouter({
    // Send a message
    send: protectedProcedure
        .input(chatSchema)
        .mutation(async ({ input, ctx }) => {
            try {
                const { message, gameId } = input;

                const chatMessage: ChatMessage = {
                    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    username: ctx.user.username,
                    message,
                    gameId,
                    timestamp: new Date(),
                };

                if (gameId) {
                    // Game-specific chat
                    if (!chatMessages.has(gameId)) {
                        chatMessages.set(gameId, []);
                    }
                    chatMessages.get(gameId)!.push(chatMessage);
                } else {
                    // Global chat
                    globalMessages.push(chatMessage);
                }

                return {
                    success: true,
                    message: chatMessage,
                };
            } catch (_error) {
                throw new Error('Failed to send message');
            }
        }),

    // Get messages
    getMessages: protectedProcedure
        .input(z.object({ gameId: z.string().optional() }))
        .query(async ({ input }) => {
            try {
                const { gameId } = input;

                if (gameId) {
                    // Get game-specific messages
                    const messages = chatMessages.get(gameId) || [];
                    return {
                        messages: messages.slice(-50), // Last 50 messages
                    };
                } else {
                    // Get global messages
                    return {
                        messages: globalMessages.slice(-50), // Last 50 messages
                    };
                }
            } catch (_error) {
                throw new Error('Failed to fetch messages');
            }
        }),

    // Clear messages (for cleanup)
    clear: protectedProcedure
        .input(z.object({ gameId: z.string().optional() }))
        .mutation(async ({ input }) => {
            try {
                const { gameId } = input;

                if (gameId) {
                    chatMessages.delete(gameId);
                } else {
                    globalMessages.length = 0;
                }

                return {
                    success: true,
                    message: 'Messages cleared',
                };
            } catch (_error) {
                throw new Error('Failed to clear messages');
            }
        }),
}); 