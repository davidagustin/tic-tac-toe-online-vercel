import { NextRequest, NextResponse } from 'next/server';
import { appRouter } from '@/lib/routers';
import { createTRPCContext } from '@/lib/trpc';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/trpc/', '');
    
    // Handle different tRPC routes
    if (path === 'game.list') {
      const context = await createTRPCContext({ req: request as any, res: {} as any });
      const result = await appRouter.game.list.query({}, { ctx: context });
      return NextResponse.json(result);
    }
    
    if (path === 'game.getState') {
      const gameId = url.searchParams.get('gameId');
      if (!gameId) {
        return NextResponse.json({ error: 'Game ID required' }, { status: 400 });
      }
      const context = await createTRPCContext({ req: request as any, res: {} as any });
      const result = await appRouter.game.getState.query({ gameId }, { ctx: context });
      return NextResponse.json(result);
    }
    
    if (path === 'game.getEvents') {
      const gameId = url.searchParams.get('gameId');
      const since = url.searchParams.get('since');
      if (!gameId) {
        return NextResponse.json({ error: 'Game ID required' }, { status: 400 });
      }
      const context = await createTRPCContext({ req: request as any, res: {} as any });
      const result = await appRouter.game.getEvents.query({ 
        gameId, 
        since: since ? parseInt(since) : undefined 
      }, { ctx: context });
      return NextResponse.json(result);
    }
    
    if (path === 'game.getStats') {
      const username = url.searchParams.get('username');
      if (!username) {
        return NextResponse.json({ error: 'Username required' }, { status: 400 });
      }
      const context = await createTRPCContext({ req: request as any, res: {} as any });
      const result = await appRouter.game.getStats.query({ username }, { ctx: context });
      return NextResponse.json(result);
    }
    
    return NextResponse.json({ error: 'Route not found' }, { status: 404 });
  } catch (error) {
    console.error('tRPC GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/trpc/', '');
    const body = await request.json();
    
    // Handle different tRPC mutations
    if (path === 'game.create') {
      const context = await createTRPCContext({ req: request as any, res: {} as any });
      const result = await appRouter.game.create.mutate(body, { ctx: context });
      return NextResponse.json(result);
    }
    
    if (path === 'game.join') {
      const context = await createTRPCContext({ req: request as any, res: {} as any });
      const result = await appRouter.game.join.mutate(body, { ctx: context });
      return NextResponse.json(result);
    }
    
    if (path === 'game.move') {
      const context = await createTRPCContext({ req: request as any, res: {} as any });
      const result = await appRouter.game.move.mutate(body, { ctx: context });
      return NextResponse.json(result);
    }
    
    if (path === 'game.leave') {
      const context = await createTRPCContext({ req: request as any, res: {} as any });
      const result = await appRouter.game.leave.mutate(body, { ctx: context });
      return NextResponse.json(result);
    }
    
    return NextResponse.json({ error: 'Route not found' }, { status: 404 });
  } catch (error) {
    console.error('tRPC POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
