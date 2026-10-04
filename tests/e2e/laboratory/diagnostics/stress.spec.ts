import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { watchAbortedModuleImports } from '../../support/aborted-module-imports.js'

async function openLaboratory(page: Page): Promise<void> {
  await page.goto('/laboratory')
  await expect(page.getByTestId('laboratory-page-title')).toHaveText('Asset Browser', { timeout: 20000 })
}

test('laboratory routes mount the stress and report sections', async ({ page }) => {
  await openLaboratory(page)
  await page.goto('/laboratory/diagnostics')
  await expect(page.getByRole('heading', { name: 'Stress Test' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Stress Test' })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('zoom')
  await page.goto('/laboratory/report')
  await expect(page.getByTestId('laboratory-page-title')).toHaveText('Asset Report')
  await expect(page.getByText('Game contracts', { exact: false })).toBeVisible()
})

test('stress: camera pan/zoom is available with a reset', async ({ page }) => {
  await openLaboratory(page)
  await page.goto('/laboratory/diagnostics')
  await expect(page.getByRole('status')).toContainText('zoom')
  const reset = page.getByRole('button', { name: 'reset camera' })
  await expect(reset).toBeVisible()
})

test('stress: renderer host keeps a stable viewport height', async ({ page }) => {
  await openLaboratory(page)
  await page.goto('/laboratory/diagnostics')
  const host = page.getByTestId('stress-canvas-host')
  await expect(host).toBeVisible()
  await expect(host.locator('canvas')).toBeVisible()
  await expect.poll(async () => (await host.boundingBox())?.height ?? 0, { timeout: 10_000 }).toBe(340)
  const initial = await host.boundingBox()
  expect(initial).not.toBeNull()
  await expect.poll(async () => (await host.boundingBox())?.height ?? 0, { timeout: 5000 }).toBe(initial!.height)
})

test('stress: rapid spawn changes followed by navigation stay stable', async ({ page }) => {
  const abortedImports = watchAbortedModuleImports(page)
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await openLaboratory(page)
  await page.goto('/laboratory/diagnostics')
  const slider = page.getByRole('slider')
  await expect(slider).toBeVisible({ timeout: 20_000 })
  await slider.focus()
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press('ArrowRight')
  }
  await page.goto('/laboratory')
  await expect(page.getByTestId('laboratory-page-title')).toHaveText('Asset Browser', { timeout: 20_000 })
  // Only the module import the browser actually aborted during navigation is a
  // harness artifact; a broken lazy import or missing chunk must still fail.
  const unexpected = pageErrors.filter((message) => !abortedImports.isKnownAbort(message))
  expect(unexpected).toEqual([])
})
