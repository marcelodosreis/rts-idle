import { expect, test } from '@playwright/test'
import { waitForMatchReady } from '../support/settle.js'

test('renderer mounts, renders a frame, and disposes cleanly', async ({ page }) => {
  await page.goto('/?scenario=regression&aggression=passive')
  await page.getByRole('button', { name: 'Open DevTools menu' }).click()
  await expect(page.getByText(/status:/)).toBeVisible()

  // Initial snapshot arrives and units are rendered.
  await waitForMatchReady(page)

  const positions = await page.evaluate(() => window.__rtsDebug?.getPositions() ?? {})
  expect(Object.keys(positions).length).toBeGreaterThan(0)
})

test('mounting the renderer twice does not duplicate state', async ({ page }) => {
  await page.goto('/?scenario=regression&aggression=passive')
  await waitForMatchReady(page)

  const count = await page.evaluate(() => document.querySelectorAll('canvas').length)
  expect(count).toBe(1)
})

test('renders the initial snapshot after an asset-delayed mount', async ({ page }) => {
  test.setTimeout(30_000)
  const pageErrors: string[] = []
  let releaseManifestRequest: () => void = () => {
    throw new Error('manifest request was not initialized')
  }
  const manifestRequestGate = new Promise<void>((resolve) => {
    releaseManifestRequest = resolve
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.route('**/assets/manifest.json', async (route) => {
    await manifestRequestGate
    await route.fulfill({ status: 404 })
  })

  const manifestRequest = page.waitForRequest('**/assets/manifest.json')
  const navigation = page.goto('/?scenario=regression&aggression=passive')
  await manifestRequest
  releaseManifestRequest()
  await navigation

  await waitForMatchReady(page)
  await expect.poll(() => page.locator('canvas').count()).toBe(1)
  const positions = await page.evaluate(() => window.__rtsDebug?.getPositions() ?? {})
  expect(Object.keys(positions).length).toBeGreaterThan(0)
  expect(pageErrors.some((error) => error.includes('PixiRenderer: not mounted'))).toBe(false)
})

test('cleans up the debug bridge and renderer across reload', async ({ page }) => {
  await page.goto('/?scenario=regression&aggression=passive')
  await waitForMatchReady(page)
  await page.reload()
  await waitForMatchReady(page)
  await expect(page.locator('canvas')).toHaveCount(1)
})
