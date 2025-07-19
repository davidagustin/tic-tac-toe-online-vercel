import { NextRequest, NextResponse } from 'next/server';
import { query, initializeDatabase } from '@/lib/db';
import { 
  SecurityValidator, 
  RateLimiter, 
  RequestValidator, 
  SecurityLogger, 
  SecurityError,
  CSP_HEADERS 
} from '@/lib/security';

export async function GET(request: NextRequest) {
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

    // Initialize database on first request
    await initializeDatabase();
    
    const messages = await query('SELECT * FROM chatRoomText ORDER BY id ASC LIMIT 50');
    
    // Create response with security headers
    const response = NextResponse.json(messages);
    
    // Add security headers
    Object.entries(CSP_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  } catch (error) {
    console.error('Error fetching messages:', error);
    
    // If database is not configured, return empty array
    if (error instanceof Error && error.message.includes('DATABASE_URL')) {
      return NextResponse.json([]);
    }
    
    // Don't expose internal errors to client
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let messageText: string | undefined;
  let userName: string | undefined;
  
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
    messageText = body.body;
    userName = body.userName;

    // Check if required fields exist
    if (!messageText || !userName) {
      return NextResponse.json({ error: 'Missing required fields: body and userName' }, { status: 400 });
    }

    // Validate and sanitize inputs
    const validatedMessage = SecurityValidator.validateMessage(messageText);
    const validatedUsername = SecurityValidator.validateUsername(userName);
    
    // Create safe query parameters
    const queryParams = `${validatedUsername}: ${validatedMessage}`;
    
    // Use parameterized query to prevent SQL injection
    await query('INSERT INTO chatRoomText (text) VALUES ($1)', [queryParams]);
    
    // Log successful message creation
    SecurityLogger.logSecurityEvent('MESSAGE_CREATED', { 
      username: validatedUsername, 
      messageLength: validatedMessage.length 
    }, 'low');
    
    // Create response with security headers
    const response = NextResponse.json({ success: true }, { status: 201 });
    
    // Add security headers
    Object.entries(CSP_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  } catch (error) {
    console.error('Error posting message:', error);
    
    // Log security events
    if (error instanceof SecurityError) {
      SecurityLogger.logInvalidInput({ messageText, userName }, 'POST_MESSAGE');
    }
    
    // If database is not configured, return success but don't store
    if (error instanceof Error && error.message.includes('DATABASE_URL')) {
      return NextResponse.json({ success: true, message: 'Database not configured - message not stored' }, { status: 201 });
    }
    
    // Handle validation errors
    if (error instanceof Error && (error.message.includes('Invalid') || error.message.includes('too long'))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    // Don't expose internal errors to client
    return NextResponse.json({ error: 'Failed to post message' }, { status: 400 });
  }
} 