import { expect, test } from '@playwright/test'

test('renderer mounts, renders a frame, and disposes cleanly', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/status:/)).toBeVisible()

  // Initial snapshot arrives and units are rendered.
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1)).toBeGreaterThan(0)

  const positions = await page.evaluate(() => window.__rtsDebug?.getPositions() ?? {})
  expect(Object.keys(positions).length).toBeGreaterThan(0)
})

test('mounting the renderer twice does not duplicate state', async ({ page }) => {
  await page.goto('/')
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1)).toBeGreaterThan(0)

  const count = await page.evaluate(() => document.querySelectorAll('canvas').length)
  expect(count).toBe(1)
})

test('renders the initial snapshot after an asset-delayed mount', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.route('**/assets/manifest.json', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    await route.fulfill({ status: 404 })
  })

  await page.goto('/')

  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1)).toBeGreaterThan(0)
  await expect.poll(() => page.locator('canvas').count()).toBe(1)
  const positions = await page.evaluate(() => window.__rtsDebug?.getPositions() ?? {})
  expect(Object.keys(positions).length).toBeGreaterThan(0)
  expect(pageErrors.some((error) => error.includes('PixiRenderer: not mounted'))).toBe(false)
})
