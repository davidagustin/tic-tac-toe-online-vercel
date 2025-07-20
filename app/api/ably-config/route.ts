import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const apiKey = process.env.ABLY_API_KEY;

        if (!apiKey) {
            console.error('ABLY_API_KEY is not set');
            return NextResponse.json(
                { error: 'Ably configuration not available' },
                { status: 500 }
            );
        }

        console.log('Ably config requested:', {
            key: apiKey ? `${apiKey.substring(0, 8)}...` : 'Not set',
            keyLength: apiKey?.length || 0,
        });

        return NextResponse.json({
            key: apiKey,
        });
    } catch (error) {
        console.error('Error fetching Ably config:', error);
        return NextResponse.json(
            { error: 'Failed to fetch Ably configuration' },
            { status: 500 }
        );
    }
} 