import { defineConfig } from '@playwright/test'

if (!process.env.PLAYWRIGHT_BASE_URL) {
  process.env.AGRONAUTAS_API_INTERNAL_URL ??= 'http://127.0.0.1:3001'
  process.env.RATE_LIMIT_STORE ??= 'memory'
}

export default defineConfig({
  testDir: './tests/e2e',
  // Keep the local Next/API web-server harness deterministic on constrained workstations.
  workers: 1,
  timeout: 30_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : [
        {
          command: 'pnpm --dir ../api dev',
          url: 'http://127.0.0.1:3001/health',
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          command: 'pnpm dev',
          url: 'http://127.0.0.1:3000',
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
})
