import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Disable parallel execution to prevent conflicts
  retries: 0, // No retries to prevent hanging
  workers: 1, // Single worker to prevent conflicts
  reporter: 'list',
  timeout: 90000, // 1.5 minutes total timeout
  expect: {
    timeout: 15000, // 15 seconds for assertions
  },
  use: {
    baseURL: 'https://tic-tac-toe-online-vercel.vercel.app',
    trace: 'off', // Disable tracing to speed up tests
    screenshot: 'only-on-failure',
    video: 'off', // Disable video to speed up tests
    actionTimeout: 15000, // 15 seconds for actions
    navigationTimeout: 30000, // 30 seconds for navigation
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
  // Ensure tests don't hang
  forbidOnly: false,
  maxFailures: 1, // Stop after first failure
}); 