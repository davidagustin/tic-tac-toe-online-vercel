import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        message: 'Test endpoint working',
        timestamp: new Date().toISOString(),
        ablyKey: process.env.ABLY_API_KEY ? 'Set' : 'Not set',
    });
} 