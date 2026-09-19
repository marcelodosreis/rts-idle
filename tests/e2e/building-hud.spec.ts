import { expect, test } from '@playwright/test'

test('construction HUD uses the concise building labels and preserves costs', async ({ page }) => {
  await page.goto('/?scenario=economy&aggression=passive')
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1)).toBeGreaterThan(0)

  const workerId = await page.evaluate(() => {
    const owners = window.__rtsDebug?.getUnitOwners() ?? {}
    return Number(Object.entries(owners).find(([, owner]) => owner === 0)?.[0] ?? -1)
  })
  expect(workerId).toBeGreaterThan(0)
  await page.evaluate((id) => window.__rtsDebug!.setSelection([id]), workerId)

  await expect(page.getByRole('button', { name: 'Base · 100', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Barracks · 150', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Build Base · 100', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Build Barracks · 150', exact: true })).toHaveCount(0)
})
