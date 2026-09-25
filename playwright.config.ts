import { defineConfig, devices } from '@playwright/test'

const configuredWorkers = process.env.E2E_WORKERS
const defaultWorkers = process.env.CI ? 1 : undefined
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
  retries: process.env.CI ? 1 : 0,
  workers: configuredWorkers === undefined ? defaultWorkers : Number(configuredWorkers),
  reporter: 'dot',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`
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
      env: { ...process.env, VITE_SERVER_URL: `ws://localhost:${SERVER_PORT}` },
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
