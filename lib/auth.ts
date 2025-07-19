// Database-based authentication module for persistent user management
import { query } from './db';
import crypto from 'crypto';

export interface User {
  id: number;
  username: string;
  password: string;
  created_at: Date;
}

export class AuthService {
  // Initialize demo users in database if they don't exist
  static async initializeDemoUsers() {
    try {
      const demoUsers = [
        { username: 'demo', password: 'demo123' },
        { username: 'test', password: 'test123' }
      ];

      for (const demoUser of demoUsers) {
        const existingUser = await this.getUser(demoUser.username);
        if (!existingUser) {
          await this.createUser(demoUser.username, demoUser.password);
          console.log(`Demo user created: ${demoUser.username}`);
        }
      }
    } catch (error) {
      console.error('Error initializing demo users:', error);
    }
  }

  static async getUser(username: string): Promise<User | undefined> {
    try {
      const result = await query(
        'SELECT id, username, password, created_at FROM users WHERE username = $1',
        [username]
      );
      return result[0] || undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  static async createUser(username: string, password: string): Promise<User> {
    try {
      // Hash the password for security
      const hashedPassword = this.hashPassword(password);
      
      const result = await query(
        'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username, password, created_at',
        [username, hashedPassword]
      );
      
      return result[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async userExists(username: string): Promise<boolean> {
    try {
      const result = await query(
        'SELECT COUNT(*) as count FROM users WHERE username = $1',
        [username]
      );
      return parseInt(result[0].count) > 0;
    } catch (error) {
      console.error('Error checking if user exists:', error);
      return false;
    }
  }

  static async validateCredentials(username: string, password: string): Promise<boolean> {
    try {
      const user = await this.getUser(username);
      if (!user) return false;
      
      // Verify the password hash
      return this.verifyPassword(password, user.password);
    } catch (error) {
      console.error('Error validating credentials:', error);
      return false;
    }
  }

  static async getAllUsers(): Promise<User[]> {
    try {
      const result = await query(
        'SELECT id, username, password, created_at FROM users ORDER BY created_at DESC'
      );
      return result;
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  static async deleteUser(username: string): Promise<boolean> {
    try {
      const result = await query(
        'DELETE FROM users WHERE username = $1 RETURNING id',
        [username]
      );
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  // Password hashing and verification
  static hashPassword(password: string): string {
    const salt = process.env.PASSWORD_SALT || 'default-salt';
    return crypto.createHash('sha256').update(password + salt).digest('hex');
  }

  static verifyPassword(password: string, hash: string): boolean {
    const hashedPassword = this.hashPassword(password);
    return crypto.timingSafeEqual(Buffer.from(hashedPassword), Buffer.from(hash));
  }

  // For debugging purposes
  static async getUsersCount(): Promise<number> {
    try {
      const result = await query('SELECT COUNT(*) as count FROM users');
      return parseInt(result[0].count);
    } catch (error) {
      console.error('Error getting users count:', error);
      return 0;
    }
  }

  static async clearUsers(): Promise<void> {
    try {
      await query('DELETE FROM users');
      console.log('All users cleared from database');
    } catch (error) {
      console.error('Error clearing users:', error);
    }
  }
} 