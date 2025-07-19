import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for games (in production, you'd use a database)
const games = new Map();

// GET /api/game/list - Get all games
export async function GET() {
  try {
    const gamesList = Array.from(games.values());
    return NextResponse.json(gamesList);
  } catch (error) {
    console.error('Error getting games:', error);
    return NextResponse.json({ error: 'Failed to get games' }, { status: 500 });
  }
} 