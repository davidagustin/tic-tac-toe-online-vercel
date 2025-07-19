import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Disable parallel execution to prevent conflicts
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries to prevent hanging
  workers: 1, // Single worker to prevent conflicts
  reporter: 'html',
  timeout: 120000, // 2 minutes timeout
  expect: {
    timeout: 30000, // 30 seconds for assertions
  },
  use: {
    baseURL: 'https://tic-tac-toe-online-vercel.vercel.app',
    trace: 'off', // Disable tracing to speed up tests
    screenshot: 'only-on-failure',
    video: 'off', // Disable video to speed up tests
    actionTimeout: 30000, // 30 seconds for actions
    navigationTimeout: 60000, // 60 seconds for navigation
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // No webServer configuration for production testing
  globalSetup: undefined,
  globalTeardown: undefined,
}); 