import { defineConfig, devices } from '@playwright/test'
import { e2eWorkerCount } from './tools/e2e/worker-count'

const WEB_PORT = parsePort(process.env.E2E_WEB_PORT, 5173)
const SERVER_PORT = parsePort(process.env.E2E_SERVER_PORT, 8080)

function parsePort(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback
  }
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`invalid E2E port: ${value}`)
  }
  return port
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: process.env.CI === 'true',
  failOnFlakyTests: process.env.CI === 'true',
  maxFailures: 1,
  retries: 0,
  workers: e2eWorkerCount(process.env.E2E_WORKERS),
  reporter: process.env.E2E_TIMINGS_FILE === undefined ? 'dot' : [['dot'], ['./tools/e2e/timing-reporter.ts']],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    // E2E asserts layout and state, never animation geometry. Reduced motion
    // collapses every motion-safe animation so measurements are deterministic.
    reducedMotion: 'reduce',
    screenshot: process.env.CI === 'true' ? 'only-on-failure' : 'off',
    trace: process.env.CI === 'true' ? 'retain-on-failure' : 'off'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    }
  ],
  webServer: [
    {
      command: `pnpm --filter @rts/web exec vite --force --port ${WEB_PORT}`,
      env: {
        ...process.env,
        VITE_SERVER_URL: `ws://localhost:${SERVER_PORT}`,
        VITE_E2E_TRANSPORT_HOOK: 'true'
      },
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe'
    },
    {
      command: 'pnpm --filter @rts/server dev',
      env: { ...process.env, PORT: String(SERVER_PORT) },
      url: `http://localhost:${SERVER_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe'
    }
  ]
})
