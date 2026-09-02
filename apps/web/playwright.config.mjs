import { defineConfig } from '@playwright/test'

import { createServer } from 'node:net'

async function reservePort() {
  const server = createServer()
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Unable to reserve a Playwright harness port')
  const port = address.port
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  return port
}

const managedHarness = !process.env.PLAYWRIGHT_BASE_URL
const apiPort = process.env.PLAYWRIGHT_API_PORT ?? (managedHarness ? String(await reservePort()) : '3001')
const webPort = process.env.PLAYWRIGHT_WEB_PORT ?? (managedHarness ? String(await reservePort()) : '3000')
const apiUrl = `http://127.0.0.1:${apiPort}`

if (managedHarness) {
  process.env.PLAYWRIGHT_API_PORT = apiPort
  process.env.PLAYWRIGHT_WEB_PORT = webPort
  process.env.AGRONAUTAS_API_INTERNAL_URL ??= apiUrl
  process.env.RATE_LIMIT_STORE ??= 'memory'
}

export default defineConfig({
  testDir: './tests/e2e',
  // Keep the local Next/API web-server harness deterministic on constrained workstations.
  workers: 1,
  timeout: 30_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${webPort}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true } },
  ],
  webServer: !managedHarness
    ? undefined
    : [
        {
          command: 'pnpm --dir ../../packages/zod-schemas build:ensure && pnpm --dir ../../packages/hydrology-engine build:ensure && pnpm --dir ../api dev',
          url: `${apiUrl}/health`,
          name: 'Iberá API harness',
          reuseExistingServer: false,
          env: { PORT: apiPort, API_PORT: apiPort, NODE_ENV: 'test', RATE_LIMIT_STORE: 'memory' },
          gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
          timeout: 120_000,
        },
        {
          command: `pnpm exec next dev --hostname 127.0.0.1 --port ${webPort}`,
          url: `http://127.0.0.1:${webPort}`,
          name: 'Iberá web harness',
          reuseExistingServer: false,
          env: { PORT: webPort, AGRONAUTAS_API_INTERNAL_URL: apiUrl, NODE_ENV: 'development' },
          gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
          timeout: 120_000,
        },
      ],
})
