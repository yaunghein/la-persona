import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig, devices } from '@playwright/test';

// `bun run` loads .env (the dev database) into process.env first, so .env.test
// must overwrite it before anything, including the web server, reads it.
Object.assign(process.env, parseEnv(readFileSync('.env.test', 'utf8')));

const isCI = Boolean(process.env.CI);
const port = 3100;

export default defineConfig({
  testDir: 'tests',
  testMatch: '**/*.test.ts',
  // Tests share one database; run them one at a time until data is isolated per test.
  workers: 1,
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `bun tests/support/run-server.ts ${
      isCI ? 'node .output/server/index.mjs' : `bunx nuxt dev --port ${port}`
    }`,
    env: { PORT: String(port) },
    url: `http://localhost:${port}`,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 30_000 },
    // Never attach to a dev server already on this port: it would use the dev database.
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: isCI ? 'pipe' : 'ignore',
  },
});
