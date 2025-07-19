import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ 
    message: 'Auth cleared successfully',
    timestamp: new Date().toISOString()
  });
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Auth clear endpoint is working',
    timestamp: new Date().toISOString()
  });
} 