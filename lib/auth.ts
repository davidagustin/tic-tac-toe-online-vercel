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

  // Check if user exists
  static async userExists(username: string): Promise<boolean> {
    try {
      const user = await this.getUserByUsername(username);
      return !!user;
    } catch (error) {
      console.error('Error checking if user exists:', error);
      return false;
    }
  }

  // Get user by username (alias for getUserByUsername)
  static async getUser(username: string): Promise<User | undefined> {
    return this.getUserByUsername(username);
  }

  // Create new user
  static async createUser(username: string, password: string): Promise<User> {
    try {
      const hashedPassword = this.hashPassword(password);
      
      const result = await query(
        'INSERT INTO users (username, password, created_at) VALUES ($1, $2, NOW()) RETURNING *',
        [username, hashedPassword]
      );
      
      return result[0] as User;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Get user by username
  static async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await query('SELECT * FROM users WHERE username = $1', [username]);
      return result[0] as User | undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  // Get user by ID
  static async getUserById(id: number): Promise<User | undefined> {
    try {
      const result = await query('SELECT * FROM users WHERE id = $1', [id]);
      return result[0] as User | undefined;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return undefined;
    }
  }

  // Validate user credentials
  static async validateCredentials(username: string, password: string): Promise<User | undefined> {
    try {
      const user = await this.getUserByUsername(username);
      if (!user) {
        return undefined;
      }

      const hashedPassword = user.password;
      const isValid = this.verifyPassword(password, hashedPassword);
      
      return isValid ? user : undefined;
    } catch (error) {
      console.error('Error validating credentials:', error);
      return undefined;
    }
  }

  // Get all users (for admin purposes)
  static async getAllUsers(): Promise<User[]> {
    try {
      const result = await query('SELECT * FROM users ORDER BY created_at DESC');
      return result as User[];
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  // Update user password
  static async updatePassword(userId: number, newPassword: string): Promise<boolean> {
    try {
      const hashedPassword = this.hashPassword(newPassword);
      await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
      return true;
    } catch (error) {
      console.error('Error updating password:', error);
      return false;
    }
  }

  // Delete user
  static async deleteUser(userId: number): Promise<boolean> {
    try {
      const result = await query('DELETE FROM users WHERE id = $1', [userId]);
      return (result as unknown[]).length > 0;
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

  // Alias for verifyPassword (for compatibility)
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return this.verifyPassword(password, hash);
  }

  // For debugging purposes
  static async getUsersCount(): Promise<number> {
    try {
      const result = await query('SELECT COUNT(*) as count FROM users');
      return parseInt((result[0] as { count: string }).count);
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