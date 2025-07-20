import { NextResponse } from 'next/server';
import { RateLimiter } from '@/lib/security';

export async function GET(request: Request) {
  try {
    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
    
    // Check rate limit
    if (!RateLimiter.checkRateLimit(ip, 10)) { // 10 requests per minute for config
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0'
          }
        }
      );
    }

    const environment = process.env.APP_ENV || 'development';
    
    let pusherConfig;
    
    switch (environment) {
      case 'production':
        pusherConfig = {
          key: process.env.PUSHER_KEY_PRODUCTION,
          cluster: process.env.PUSHER_CLUSTER_PRODUCTION,
        };
        break;
      case 'staging':
        pusherConfig = {
          key: process.env.PUSHER_KEY_STAGING,
          cluster: process.env.PUSHER_CLUSTER_STAGING,
        };
        break;
      default: // development
        pusherConfig = {
          key: process.env.PUSHER_KEY,
          cluster: process.env.PUSHER_CLUSTER,
        };
    }

    if (!pusherConfig.key || !pusherConfig.cluster) {
      return NextResponse.json(
        { error: 'Pusher configuration not available' },
        { status: 500 }
      );
    }

    // Get rate limit info
    const rateLimitInfo = RateLimiter.getRateLimitInfo(ip);
    const headers: Record<string, string> = {
      'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
    };

    if (rateLimitInfo) {
      headers['X-RateLimit-Limit'] = '10';
      headers['X-RateLimit-Remaining'] = rateLimitInfo.remaining.toString();
      headers['X-RateLimit-Reset'] = rateLimitInfo.resetTime.toString();
    }

    return NextResponse.json(pusherConfig, { headers });
  } catch (error) {
    console.error('Error in pusher-config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 