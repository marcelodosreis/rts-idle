import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

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
  const initial = await host.boundingBox()
  expect(initial).not.toBeNull()
  expect(initial!.height).toBe(340)
  await expect.poll(async () => (await host.boundingBox())?.height ?? 0, { timeout: 5000 }).toBe(initial!.height)
})
