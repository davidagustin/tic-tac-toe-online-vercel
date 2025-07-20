import { db } from '@/lib/db';
import { games } from '@/lib/game-storage';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  try {
    console.log('🧹 Clearing database and in-memory storage...');

    // Clear all tables
    await db.query('DELETE FROM game_chat_messages');
    await db.query('DELETE FROM lobby_chat_messages');
    await db.query('DELETE FROM game_statistics');
    await db.query('DELETE FROM games');
    await db.query('DELETE FROM users');

    // Clear in-memory game storage
    const gameCount = games.size;
    games.clear();

    console.log(`✅ Database and in-memory storage cleared successfully (${gameCount} games removed from memory)`);

    return NextResponse.json({
      message: 'Database and in-memory storage cleared successfully',
      cleared: {
        users: 'all',
        games: 'all',
        game_chat_messages: 'all',
        lobby_chat_messages: 'all',
        game_statistics: 'all',
        inMemoryGames: gameCount
      }
    });
  } catch (error) {
    console.error('Error clearing database:', error);
    return NextResponse.json(
      { error: 'Failed to clear database' },
      { status: 500 }
    );
  }
} 