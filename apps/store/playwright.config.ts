import type { PlaywrightTestConfig } from '@playwright/test';
import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3110);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const shouldStartWebServer =
  !process.env.PLAYWRIGHT_BASE_URL && process.env.PLAYWRIGHT_NO_SERVER !== '1';

const config: PlaywrightTestConfig = {
  timeout: 120000,
  testDir: './tests',
  testMatch: ['**/*.spec.ts', 'e2e/**/*.test.{ts,js}'],
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
  globalSetup: "./tests/global-setup.ts",
};

if (shouldStartWebServer) {
  const dubPk = process.env.NEXT_PUBLIC_DUB_PUBLISHABLE_KEY;
  config.webServer = {
    command: `pnpm exec next dev --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: true,
    env: {
      POSTHOG_API_HOST: 'https://us.i.posthog.com',
      ...(dubPk ? { NEXT_PUBLIC_DUB_PUBLISHABLE_KEY: dubPk } : {}),
    },
  };
}

export default defineConfig(config);
