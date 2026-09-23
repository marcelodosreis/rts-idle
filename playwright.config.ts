import { defineConfig, devices } from '@playwright/test'

const configuredWorkers = process.env.E2E_WORKERS
const defaultWorkers = process.env.CI ? 1 : undefined

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: process.env.CI === 'true',
  retries: process.env.CI ? 1 : 0,
  workers: configuredWorkers === undefined ? defaultWorkers : Number(configuredWorkers),
  reporter: 'dot',
  use: {
    baseURL: 'http://localhost:5173'
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
      command: 'pnpm --filter @rts/web dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe'
    },
    {
      command: 'pnpm --filter @rts/server dev',
      url: 'http://localhost:8080/health',
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe'
    }
  ]
})
