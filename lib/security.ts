import crypto from 'crypto';
import { NextRequest } from 'next/server';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security configuration
const SECURITY_CONFIG = {
  MAX_MESSAGE_LENGTH: 500,
  MAX_USERNAME_LENGTH: 50,
  MAX_GAME_NAME_LENGTH: 100,
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 100,
  SOCKET_RATE_LIMIT_MAX: 50,
  ALLOWED_CHARACTERS: /^[a-zA-Z0-9\s\-_.,!?@#$%^&*()+=:;"'<>[\]{}|\\/~`]+$/,
  ALLOWED_USERNAME_CHARACTERS: /^[a-zA-Z0-9\s\-_]+$/,
  ALLOWED_GAME_NAME_CHARACTERS: /^[a-zA-Z0-9\s\-_.,!?()]+$/,
  MAX_BOARD_INDEX: 8,
  MIN_BOARD_INDEX: 0,
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
};

// Input validation and sanitization
export class SecurityValidator {
  // Sanitize and validate user input
  static sanitizeInput(input: string, maxLength: number, allowedPattern: RegExp): string {
    if (!input || typeof input !== 'string') {
      throw new Error('Invalid input type');
    }

    // Trim whitespace
    let sanitized = input.trim();

    // Check length
    if (sanitized.length > maxLength) {
      throw new Error(`Input too long. Maximum ${maxLength} characters allowed.`);
    }

    if (sanitized.length === 0) {
      throw new Error('Input cannot be empty');
    }

    // Check for allowed characters
    if (!allowedPattern.test(sanitized)) {
      throw new Error('Input contains invalid characters');
    }

    // Remove potential XSS vectors
    sanitized = sanitized
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

    return sanitized;
  }

  // Validate username
  static validateUsername(username: string): string {
    return this.sanitizeInput(
      username,
      SECURITY_CONFIG.MAX_USERNAME_LENGTH,
      SECURITY_CONFIG.ALLOWED_USERNAME_CHARACTERS
    );
  }

  // Validate game name
  static validateGameName(gameName: string): string {
    return this.sanitizeInput(
      gameName,
      SECURITY_CONFIG.MAX_GAME_NAME_LENGTH,
      SECURITY_CONFIG.ALLOWED_GAME_NAME_CHARACTERS
    );
  }

  // Validate chat message
  static validateMessage(message: string): string {
    return this.sanitizeInput(
      message,
      SECURITY_CONFIG.MAX_MESSAGE_LENGTH,
      SECURITY_CONFIG.ALLOWED_CHARACTERS
    );
  }

  // Validate game board index
  static validateBoardIndex(index: number): number {
    if (typeof index !== 'number' || !Number.isInteger(index)) {
      throw new Error('Invalid board index type');
    }

    if (index < SECURITY_CONFIG.MIN_BOARD_INDEX || index > SECURITY_CONFIG.MAX_BOARD_INDEX) {
      throw new Error('Invalid board index');
    }

    return index;
  }

  // Validate game ID
  static validateGameId(gameId: string): string {
    if (!gameId || typeof gameId !== 'string') {
      throw new Error('Invalid game ID');
    }

    // Game ID should be a timestamp string
    if (!/^\d+$/.test(gameId)) {
      throw new Error('Invalid game ID format');
    }

    return gameId;
  }

  // Validate player symbol
  static validatePlayerSymbol(symbol: string): string {
    if (symbol !== 'X' && symbol !== 'O') {
      throw new Error('Invalid player symbol');
    }
    return symbol;
  }
}

// Rate limiting
export class RateLimiter {
  static checkRateLimit(identifier: string, maxRequests: number = SECURITY_CONFIG.RATE_LIMIT_MAX_REQUESTS): boolean {
    const now = Date.now();
    const windowStart = now - SECURITY_CONFIG.RATE_LIMIT_WINDOW;

    const current = rateLimitStore.get(identifier);
    
    if (!current || current.resetTime < now) {
      // First request or window expired
      rateLimitStore.set(identifier, {
        count: 1,
        resetTime: now + SECURITY_CONFIG.RATE_LIMIT_WINDOW
      });
      return true;
    }

    if (current.count >= maxRequests) {
      return false; // Rate limit exceeded
    }

    // Increment count
    current.count++;
    return true;
  }

  static getRateLimitInfo(identifier: string): { remaining: number; resetTime: number } | null {
    const current = rateLimitStore.get(identifier);
    if (!current) return null;

    const now = Date.now();
    if (current.resetTime < now) return null;

    return {
      remaining: Math.max(0, SECURITY_CONFIG.RATE_LIMIT_MAX_REQUESTS - current.count),
      resetTime: current.resetTime
    };
  }
}

// Session management
export class SessionManager {
  static generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static generateSecureToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  static hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password + process.env.PASSWORD_SALT || 'default-salt').digest('hex');
  }

  static verifyPassword(password: string, hash: string): boolean {
    const hashedPassword = this.hashPassword(password);
    return crypto.timingSafeEqual(Buffer.from(hashedPassword), Buffer.from(hash));
  }
}

// Request validation for API routes
export class RequestValidator {
  static validateApiRequest(req: NextRequest): { ip: string; userAgent: string } {
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               'unknown';

    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Basic validation
    if (!ip || ip === 'unknown') {
      throw new Error('Unable to determine client IP');
    }

    return { ip, userAgent };
  }

  static validateJsonBody(body: any): any {
    if (!body || typeof body !== 'object') {
      throw new Error('Invalid request body');
    }

    return body;
  }
}

// Socket.IO security middleware
export class SocketSecurity {
  static validateSocketData(data: any, type: 'chat' | 'game' | 'move'): any {
    try {
      switch (type) {
        case 'chat':
          if (!data || typeof data !== 'object') {
            throw new Error('Invalid chat data');
          }
          if (data.text) {
            data.text = SecurityValidator.validateMessage(data.text);
          }
          break;

        case 'game':
          if (!data || typeof data !== 'object') {
            throw new Error('Invalid game data');
          }
          if (data.name) {
            data.name = SecurityValidator.validateGameName(data.name);
          }
          if (data.createdBy) {
            data.createdBy = SecurityValidator.validateUsername(data.createdBy);
          }
          break;

        case 'move':
          if (!data || typeof data !== 'object') {
            throw new Error('Invalid move data');
          }
          if (data.gameId) {
            data.gameId = SecurityValidator.validateGameId(data.gameId);
          }
          if (data.index !== undefined) {
            data.index = SecurityValidator.validateBoardIndex(data.index);
          }
          if (data.player) {
            data.player = SecurityValidator.validatePlayerSymbol(data.player);
          }
          break;
      }

      return data;
    } catch (error) {
      throw new Error(`Socket data validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static validateSocketConnection(socket: any): boolean {
    // Validate socket connection
    if (!socket || !socket.id) {
      return false;
    }

    // Check if socket ID is valid format
    if (!/^[a-zA-Z0-9_-]+$/.test(socket.id)) {
      return false;
    }

    return true;
  }
}

// Content Security Policy
export const CSP_HEADERS = {
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
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

// Error handling
export class SecurityError extends Error {
  constructor(message: string, public code: string = 'SECURITY_ERROR') {
    super(message);
    this.name = 'SecurityError';
  }
}

// Logging for security events
export class SecurityLogger {
  static logSecurityEvent(event: string, details: any, severity: 'low' | 'medium' | 'high' = 'low') {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      event,
      details,
      severity,
      environment: process.env.NODE_ENV || 'development'
    };

    // In production, send to security monitoring service
    if (process.env.NODE_ENV === 'production') {
      console.error('SECURITY EVENT:', JSON.stringify(logEntry));
      // TODO: Send to security monitoring service (e.g., Sentry, LogRocket)
    } else {
      console.warn('SECURITY EVENT:', JSON.stringify(logEntry));
    }
  }

  static logRateLimitExceeded(identifier: string) {
    this.logSecurityEvent('RATE_LIMIT_EXCEEDED', { identifier }, 'medium');
  }

  static logInvalidInput(input: any, context: string) {
    this.logSecurityEvent('INVALID_INPUT', { input, context }, 'low');
  }

  static logSuspiciousActivity(activity: string, details: any) {
    this.logSecurityEvent('SUSPICIOUS_ACTIVITY', { activity, details }, 'high');
  }
} 