import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function POST(request: NextRequest) {
  let username: string | undefined;
  let password: string | undefined;
  
  try {
    // Parse request body
    const body = await request.json() as { username?: string; password?: string };
    username = body.username;
    password = body.password;

    // Check if required fields exist
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // Basic validation
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }
    
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    // Check if user already exists
    const userExists = await AuthService.userExists(username);
    if (userExists) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    // Create new user
    const newUser = await AuthService.createUser(username, password);

    // Return success response
    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        username: username,
        createdAt: newUser.created_at.toISOString()
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle validation errors
    if (error instanceof Error && (error.message.includes('Invalid') || error.message.includes('too long'))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    // Return detailed error for debugging
    return NextResponse.json({ 
      error: 'Registration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 