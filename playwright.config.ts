import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: process.env.CI === 'true',
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: [
    {
      command: 'pnpm --filter @rts/web dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI
    },
    {
      command: 'pnpm --filter @rts/server dev',
      url: 'http://localhost:8080/health',
      reuseExistingServer: !process.env.CI
    }
  ]
})
