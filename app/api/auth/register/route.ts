import { NextRequest, NextResponse } from 'next/server';
import { SecurityValidator, RateLimiter, RequestValidator, SecurityLogger, CSP_HEADERS } from '@/lib/security';

// In-memory user store (in production, use a database)
const users = new Map<string, { username: string; password: string; createdAt: Date }>();

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
    
    // Basic password validation
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    // Check if user already exists
    if (users.has(validatedUsername)) {
      SecurityLogger.logSecurityEvent('REGISTER_FAILED', { username: validatedUsername, reason: 'User already exists' }, 'low');
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    // Create new user
    const newUser = {
      username: validatedUsername,
      password: password, // In production, hash the password
      createdAt: new Date()
    };

    users.set(validatedUsername, newUser);

    // Log successful registration
    SecurityLogger.logSecurityEvent('REGISTER_SUCCESS', { username: validatedUsername }, 'low');

    // Create response with security headers
    const response = NextResponse.json({
      success: true,
      user: {
        id: Date.now(),
        username: validatedUsername,
        createdAt: newUser.createdAt.toISOString()
      }
    });
    
    // Add security headers
    Object.entries(CSP_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  } catch (error) {
    console.error('Registration error:', error);
    
    // Log security events
    if (error instanceof Error && error.message.includes('Invalid')) {
      SecurityLogger.logInvalidInput({ username, password }, 'REGISTER');
    }
    
    // Handle validation errors
    if (error instanceof Error && (error.message.includes('Invalid') || error.message.includes('too long'))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    // Don't expose internal errors to client
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
} 