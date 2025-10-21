import type { PlaywrightTestConfig } from '@playwright/test';
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
const shouldStartWebServer =
  !process.env.PLAYWRIGHT_BASE_URL && process.env.PLAYWRIGHT_NO_SERVER !== '1';

const config: PlaywrightTestConfig = {
  timeout: 120000,
  testDir: './tests',
  testMatch: ['**/*.spec.ts', 'e2e/**/*.test.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
};

if (shouldStartWebServer) {
  config.webServer = {
    command: 'pnpm exec next dev --hostname 127.0.0.1 --port 3000',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    env: {
      POSTHOG_API_HOST: 'https://us.i.posthog.com',
    },
  };
}

export default defineConfig(config);
