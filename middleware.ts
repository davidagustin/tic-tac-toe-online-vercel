import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Security headers configuration
const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' ws: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cache-Control': 'no-store, max-age=0',
};

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  WINDOW_MS: 60000, // 1 minute
  MAX_REQUESTS: process.env.NODE_ENV === 'development' ? 1000 : 100, // Higher limit for development
};

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') || 
         request.headers.get('x-real-ip') || 
         'unknown';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const current = rateLimitStore.get(ip);
  
  if (!current || current.resetTime < now) {
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_CONFIG.WINDOW_MS
    });
    return true;
  }

  if (current.count >= RATE_LIMIT_CONFIG.MAX_REQUESTS) {
    return false;
  }

  current.count++;
  return true;
}

function isSuspiciousRequest(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent') || '';
  const url = request.url;
  
  // Check for common attack patterns
  const suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /union\s+select/gi,
    /drop\s+table/gi,
    /insert\s+into/gi,
    /delete\s+from/gi,
    /update\s+set/gi,
    /exec\s*\(/gi,
    /eval\s*\(/gi,
    /document\.cookie/gi,
    /window\.location/gi,
  ];

  // Check URL for suspicious patterns
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url)) {
      return true;
    }
  }

  // Check User-Agent for suspicious patterns
  const suspiciousUserAgents = [
    /sqlmap/gi,
    /nikto/gi,
    /nmap/gi,
    /w3af/gi,
    /burp/gi,
    /zap/gi,
    /scanner/gi,
    /crawler/gi,
    /bot/gi,
  ];

  for (const pattern of suspiciousUserAgents) {
    if (pattern.test(userAgent)) {
      return true;
    }
  }

  return false;
}

export function middleware(request: NextRequest) {
  const ip = getClientIP(request);
  const url = request.nextUrl.pathname;

  // Log security events
  const logSecurityEvent = (event: string, details: any) => {
    const timestamp = new Date().toISOString();
    console.warn('SECURITY EVENT:', JSON.stringify({
      timestamp,
      event,
      details,
      ip,
      userAgent: request.headers.get('user-agent'),
      url: request.url,
      method: request.method,
      environment: process.env.NODE_ENV || 'development'
    }));
  };

  // Check for suspicious requests
  if (isSuspiciousRequest(request)) {
    logSecurityEvent('SUSPICIOUS_REQUEST', { 
      reason: 'Pattern matching detected suspicious content',
      url: request.url 
    });
    return new NextResponse(JSON.stringify({ 
      error: 'Forbidden',
      message: 'Access denied due to security policy.'
    }), { 
      status: 403,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Rate limiting
  if (!checkRateLimit(ip)) {
    logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip });
    return new NextResponse(JSON.stringify({ 
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: 60
    }), { 
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '60',
        'X-RateLimit-Limit': RATE_LIMIT_CONFIG.MAX_REQUESTS.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': (Date.now() + RATE_LIMIT_CONFIG.WINDOW_MS).toString(),
      }
    });
  }

  // Block access to sensitive files
  const sensitivePaths = [
    '/.env',
    '/.git',
    '/package.json',
    '/package-lock.json',
    '/yarn.lock',
    '/node_modules',
    '/.next',
    '/.vercel',
  ];

  // Allow static assets and public files
  const allowedStaticPaths = [
    '/favicon.ico',
    '/manifest.json',
    '/robots.txt',
    '/sitemap.xml',
    '/_next/static',
    '/_next/image',
  ];

  // Check if this is an allowed static path
  const isAllowedStaticPath = allowedStaticPaths.some(allowedPath => url.startsWith(allowedPath));

  // Allow authentication and game API endpoints
  const allowedApiPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/mvp',
    '/api/game/list',
    '/api/game/create',
    '/api/game/join',
    '/api/game/move',
    '/api/games',
    '/api/chat',
    '/api/stats',
    '/api/clear-auth',
    '/api/test-pusher',
    '/api/debug-env',
    '/api/pusher-config',
  ];

  // Check if this is an allowed API path (including dynamic routes)
  const isAllowedApiPath = allowedApiPaths.some(allowedPath => {
    if (allowedPath === url) return true;
    // Handle dynamic routes
    if (allowedPath === '/api/stats' && url.startsWith('/api/stats/')) return true;
    if (allowedPath === '/api/games' && url.startsWith('/api/games/')) return true;
    return false;
  });

  // Allow static assets to pass through
  if (isAllowedStaticPath) {
    return NextResponse.next();
  }

  for (const path of sensitivePaths) {
    if (url.startsWith(path)) {
      logSecurityEvent('SENSITIVE_PATH_ACCESS', { path });
      return new NextResponse(JSON.stringify({ 
        error: 'Not Found',
        message: 'The requested resource was not found.'
      }), { 
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }

  // Block other API paths except allowed ones
  if (url.startsWith('/api/') && !isAllowedApiPath) {
    logSecurityEvent('SENSITIVE_PATH_ACCESS', { path: '/api/' });
    return new NextResponse(JSON.stringify({ 
      error: 'Not Found',
      message: 'The requested resource was not found.'
    }), { 
      status: 404,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Add security headers to all responses
  const response = NextResponse.next();

  // Add security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add rate limit headers
  const rateLimitInfo = rateLimitStore.get(ip);
  if (rateLimitInfo) {
    response.headers.set('X-RateLimit-Limit', RATE_LIMIT_CONFIG.MAX_REQUESTS.toString());
    response.headers.set('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT_CONFIG.MAX_REQUESTS - rateLimitInfo.count).toString());
    response.headers.set('X-RateLimit-Reset', rateLimitInfo.resetTime.toString());
  }

  // Add request ID for tracking
  const requestId = crypto.randomUUID();
  response.headers.set('X-Request-ID', requestId);

  // Log successful requests in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${requestId}] ${request.method} ${url} - ${ip}`);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}; 