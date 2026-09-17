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
