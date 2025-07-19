import { NextRequest, NextResponse } from 'next/server';
import { SecurityValidator, RateLimiter, RequestValidator, SecurityLogger, CSP_HEADERS } from '@/lib/security';

// In-memory user store (in production, use a database)
const users = new Map<string, { username: string; password: string; createdAt: Date }>();

// Add some demo users for testing
users.set('demo', {
  username: 'demo',
  password: 'demo123',
  createdAt: new Date()
});

users.set('test', {
  username: 'test',
  password: 'test123',
  createdAt: new Date()
});

export async function POST(request: NextRequest) {
  let username: string | undefined;
  let password: string | undefined;
  
  try {
    // Validate request
    const { ip } = RequestValidator.validateApiRequest(request);
    
    // Rate limiting
    if (!RateLimiter.checkRateLimit(ip)) {
      SecurityLogger.logRateLimitExceeded(ip);
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' }, 
        { status: 429 }
      );
    }

    // Validate request body
    const body = RequestValidator.validateJsonBody(await request.json());
    username = body.username;
    password = body.password;

    // Check if required fields exist
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // Validate and sanitize inputs
    const validatedUsername = SecurityValidator.validateUsername(username);
    const validatedPassword = password; // Password validation is handled by the client

    // Check if user exists
    const user = users.get(validatedUsername);
    if (!user) {
      SecurityLogger.logSecurityEvent('LOGIN_FAILED', { username: validatedUsername, reason: 'User not found' }, 'low');
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // Check password (in production, use proper password hashing)
    if (user.password !== validatedPassword) {
      SecurityLogger.logSecurityEvent('LOGIN_FAILED', { username: validatedUsername, reason: 'Invalid password' }, 'low');
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // Log successful login
    SecurityLogger.logSecurityEvent('LOGIN_SUCCESS', { username: validatedUsername }, 'low');

    // Create response with security headers
    const response = NextResponse.json({
      success: true,
      user: {
        id: Date.now(),
        username: validatedUsername,
        createdAt: user.createdAt.toISOString()
      }
    });
    
    // Add security headers
    Object.entries(CSP_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    
    // Log security events
    if (error instanceof Error && error.message.includes('Invalid')) {
      SecurityLogger.logInvalidInput({ username, password }, 'LOGIN');
    }
    
    // Handle validation errors
    if (error instanceof Error && (error.message.includes('Invalid') || error.message.includes('too long'))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    // Don't expose internal errors to client
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
} 