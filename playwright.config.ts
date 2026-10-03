import { defineConfig } from '@playwright/test';

const localBrowserChannel = process.env.PLAYWRIGHT_CHANNEL || (process.env.CI ? undefined : 'chrome');
const requestedTestPort = Number.parseInt(process.env.PLAYWRIGHT_PORT || '3100', 10);
const testPort = Number.isInteger(requestedTestPort) && requestedTestPort > 0 && requestedTestPort < 65_536
  ? requestedTestPort
  : 3100;
const testBaseUrl = `http://127.0.0.1:${testPort}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: testBaseUrl,
    channel: localBrowserChannel,
    colorScheme: 'light',
    locale: 'en-US',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run start',
    url: `${testBaseUrl}/api/health`,
    env: {
      NODE_ENV: 'production',
      GEMINI_API_KEY: '',
      GITHUB_TOKEN: '',
      JIRA_API_TOKEN: '',
      STUDIO_GITHUB_APP_PRIVATE_KEY: '',
      STUDIO_GITHUB_APP_ID: '',
      STUDIO_GITHUB_APP_INSTALLATION_ID: '',
      STUDIO_AUTH_MODE: 'disabled',
      VERCEL: '',
      PORT: String(testPort),
      HOST: '127.0.0.1',
      DISABLE_HMR: 'true',
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
