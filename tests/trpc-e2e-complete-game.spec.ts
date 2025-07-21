import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 60000; // 60 seconds

// Test data
const PLAYER1 = {
  username: 'player1_test',
  password: 'password123',
  email: 'player1@test.com'
};

const PLAYER2 = {
  username: 'player2_test',
  password: 'password123',
  email: 'player2@test.com'
};

const GAME_NAME = 'Test Game - ' + Date.now();

interface GameState {
  id: string;
  name: string;
  board: string[];
  currentPlayer: string;
  players: string[];
  status: 'waiting' | 'playing' | 'finished';
  winner?: string;
}

interface UserStats {
  username: string;
  stats: {
    wins: number;
    losses: number;
    draws: number;
  };
  totalGames: number;
}

class GameClient {
  private page: Page;
  private baseUrl: string;

  constructor(page: Page, baseUrl: string) {
    this.page = page;
    this.baseUrl = baseUrl;
  }

  async navigateToHome() {
    await this.page.goto(this.baseUrl);
    await this.page.waitForLoadState('networkidle');
  }

  async register(user: typeof PLAYER1) {
    console.log(`🔐 Registering user: ${user.username}`);
    
    // Navigate to registration
    await this.page.goto(`${this.baseUrl}/register`);
    await this.page.waitForLoadState('networkidle');

    // Fill registration form
    await this.page.fill('input[name="username"]', user.username);
    await this.page.fill('input[name="email"]', user.email);
    await this.page.fill('input[name="password"]', user.password);
    await this.page.fill('input[name="confirmPassword"]', user.password);

    // Submit registration
    await this.page.click('button[type="submit"]');
    
    // Wait for successful registration
    await this.page.waitForURL(`${this.baseUrl}/dashboard`, { timeout: 10000 });
    console.log(`✅ User registered: ${user.username}`);
  }

  async login(user: typeof PLAYER1) {
    console.log(`🔐 Logging in user: ${user.username}`);
    
    // Navigate to login
    await this.page.goto(`${this.baseUrl}/login`);
    await this.page.waitForLoadState('networkidle');

    // Fill login form
    await this.page.fill('input[name="username"]', user.username);
    await this.page.fill('input[name="password"]', user.password);

    // Submit login
    await this.page.click('button[type="submit"]');
    
    // Wait for successful login
    await this.page.waitForURL(`${this.baseUrl}/dashboard`, { timeout: 10000 });
    console.log(`✅ User logged in: ${user.username}`);
  }

  async createGame(gameName: string): Promise<string> {
    console.log(`🎮 Creating game: ${gameName}`);
    
    // Navigate to game creation
    await this.page.goto(`${this.baseUrl}/create-game`);
    await this.page.waitForLoadState('networkidle');

    // Fill game creation form
    await this.page.fill('input[name="gameName"]', gameName);
    
    // Submit game creation
    await this.page.click('button[type="submit"]');
    
    // Wait for game to be created and redirected to game page
    await this.page.waitForURL(/\/game\/[^\/]+$/, { timeout: 10000 });
    
    // Extract game ID from URL
    const gameUrl = this.page.url();
    const gameId = gameUrl.split('/').pop()!;
    
    console.log(`✅ Game created with ID: ${gameId}`);
    return gameId;
  }

  async joinGame(gameId: string) {
    console.log(`🎮 Joining game: ${gameId}`);
    
    // Navigate to game
    await this.page.goto(`${this.baseUrl}/game/${gameId}`);
    await this.page.waitForLoadState('networkidle');
    
    // Click join button if available
    const joinButton = this.page.locator('button:has-text("Join Game")');
    if (await joinButton.isVisible()) {
      await joinButton.click();
      await this.page.waitForTimeout(2000);
    }
    
    console.log(`✅ Joined game: ${gameId}`);
  }

  async makeMove(position: number) {
    console.log(`🎯 Making move at position: ${position}`);
    
    // Find the cell and click it
    const cell = this.page.locator(`[data-testid="cell-${position}"]`);
    await cell.click();
    
    // Wait for move to be processed
    await this.page.waitForTimeout(1000);
    
    console.log(`✅ Move made at position: ${position}`);
  }

  async waitForGameUpdate(expectedStatus?: string) {
    console.log(`⏳ Waiting for game update...`);
    
    if (expectedStatus) {
      await this.page.waitForFunction(
        (status) => {
          const statusElement = document.querySelector('[data-testid="game-status"]');
          return statusElement && statusElement.textContent?.includes(status);
        },
        expectedStatus,
        { timeout: 10000 }
      );
    } else {
      await this.page.waitForTimeout(2000);
    }
    
    console.log(`✅ Game updated`);
  }

  async getGameState(): Promise<GameState> {
    const gameState = await this.page.evaluate(() => {
      const gameElement = document.querySelector('[data-testid="game-state"]');
      if (gameElement) {
        return JSON.parse(gameElement.textContent || '{}');
      }
      return null;
    });
    
    return gameState;
  }

  async leaveGame() {
    console.log(`🚪 Leaving game`);
    
    const leaveButton = this.page.locator('button:has-text("Leave Game")');
    if (await leaveButton.isVisible()) {
      await leaveButton.click();
      await this.page.waitForTimeout(2000);
    }
    
    console.log(`✅ Left game`);
  }

  async checkStats(username: string): Promise<UserStats> {
    console.log(`📊 Checking stats for: ${username}`);
    
    // Navigate to stats page
    await this.page.goto(`${this.baseUrl}/stats/${username}`);
    await this.page.waitForLoadState('networkidle');
    
    // Extract stats from page
    const stats = await this.page.evaluate(() => {
      const winsElement = document.querySelector('[data-testid="wins"]');
      const lossesElement = document.querySelector('[data-testid="losses"]');
      const drawsElement = document.querySelector('[data-testid="draws"]');
      
      return {
        wins: parseInt(winsElement?.textContent || '0'),
        losses: parseInt(lossesElement?.textContent || '0'),
        draws: parseInt(drawsElement?.textContent || '0')
      };
    });
    
    console.log(`✅ Stats retrieved:`, stats);
    return {
      username,
      stats,
      totalGames: stats.wins + stats.losses + stats.draws
    };
  }

  async logout() {
    console.log(`🚪 Logging out`);
    
    const logoutButton = this.page.locator('button:has-text("Logout")');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await this.page.waitForTimeout(2000);
    }
    
    console.log(`✅ Logged out`);
  }
}

test.describe('Complete tRPC Game Flow', () => {
  test('Complete game flow with two players', async ({ browser }) => {
    test.setTimeout(TEST_TIMEOUT);
    
    // Create two browser contexts for two players
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    const client1 = new GameClient(page1, BASE_URL);
    const client2 = new GameClient(page2, BASE_URL);
    
    try {
      console.log('🎮 Starting complete game flow test...');
      
      // Step 1: Register both players
      console.log('\n📝 Step 1: Registering players...');
      await client1.register(PLAYER1);
      await client2.register(PLAYER2);
      
      // Step 2: Login both players
      console.log('\n🔐 Step 2: Logging in players...');
      await client1.login(PLAYER1);
      await client2.login(PLAYER2);
      
      // Step 3: Player 1 creates a game
      console.log('\n🎮 Step 3: Player 1 creating game...');
      const gameId = await client1.createGame(GAME_NAME);
      expect(gameId).toBeTruthy();
      
      // Step 4: Player 2 joins the game
      console.log('\n🎮 Step 4: Player 2 joining game...');
      await client2.joinGame(gameId);
      
      // Step 5: Wait for game to start
      console.log('\n⏳ Step 5: Waiting for game to start...');
      await client1.waitForGameUpdate('playing');
      await client2.waitForGameUpdate('playing');
      
      // Step 6: Play the game (Player 1 wins with a specific pattern)
      console.log('\n🎯 Step 6: Playing the game...');
      
      // Player 1: X at position 0 (top-left)
      await client1.makeMove(0);
      await client1.waitForGameUpdate();
      await client2.waitForGameUpdate();
      
      // Player 2: O at position 4 (center)
      await client2.makeMove(4);
      await client1.waitForGameUpdate();
      await client2.waitForGameUpdate();
      
      // Player 1: X at position 1 (top-center)
      await client1.makeMove(1);
      await client1.waitForGameUpdate();
      await client2.waitForGameUpdate();
      
      // Player 2: O at position 8 (bottom-right)
      await client2.makeMove(8);
      await client1.waitForGameUpdate();
      await client2.waitForGameUpdate();
      
      // Player 1: X at position 2 (top-right) - WINNING MOVE
      await client1.makeMove(2);
      await client1.waitForGameUpdate('finished');
      await client2.waitForGameUpdate('finished');
      
      // Step 7: Verify game is finished and Player 1 won
      console.log('\n🏆 Step 7: Verifying game result...');
      const gameState1 = await client1.getGameState();
      const gameState2 = await client2.getGameState();
      
      expect(gameState1.status).toBe('finished');
      expect(gameState2.status).toBe('finished');
      expect(gameState1.winner).toBe(PLAYER1.username);
      expect(gameState2.winner).toBe(PLAYER1.username);
      
      // Step 8: Both players leave the game
      console.log('\n🚪 Step 8: Players leaving game...');
      await client1.leaveGame();
      await client2.leaveGame();
      
      // Step 9: Check updated statistics
      console.log('\n📊 Step 9: Checking updated statistics...');
      const stats1 = await client1.checkStats(PLAYER1.username);
      const stats2 = await client2.checkStats(PLAYER2.username);
      
      // Verify Player 1 has 1 win
      expect(stats1.stats.wins).toBe(1);
      expect(stats1.stats.losses).toBe(0);
      expect(stats1.stats.draws).toBe(0);
      expect(stats1.totalGames).toBe(1);
      
      // Verify Player 2 has 1 loss
      expect(stats2.stats.wins).toBe(0);
      expect(stats2.stats.losses).toBe(1);
      expect(stats2.stats.draws).toBe(0);
      expect(stats2.totalGames).toBe(1);
      
      // Step 10: Both players logout
      console.log('\n🚪 Step 10: Players logging out...');
      await client1.logout();
      await client2.logout();
      
      console.log('\n✅ Complete game flow test passed!');
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      
      // Take screenshots for debugging
      await page1.screenshot({ path: 'test-results/player1-error.png' });
      await page2.screenshot({ path: 'test-results/player2-error.png' });
      
      throw error;
    } finally {
      // Clean up
      await context1.close();
      await context2.close();
    }
  });
}); 