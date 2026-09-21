import { expect, test } from '@playwright/test'
import { FIXED_SCALE, tilesToFixed } from '@rts/shared'

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

test('construction stays at the clicked location while the worker travels', async ({ page }) => {
  test.setTimeout(30_000)
  await page.goto('/?scenario=economy&aggression=passive')
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1)).toBeGreaterThan(0)

  const workerId = await page.evaluate(() => {
    const owners = window.__rtsDebug?.getUnitOwners() ?? {}
    return Number(Object.entries(owners).find(([, owner]) => owner === 0)?.[0] ?? -1)
  })
  expect(workerId).toBeGreaterThan(0)
  await page.evaluate((id) => window.__rtsDebug!.setSelection([id]), workerId)
  await page.getByRole('button', { name: 'Base · 100', exact: true }).click()

  const target = { x: tilesToFixed(10), y: tilesToFixed(9) }
  const clickTarget = { x: target.x + FIXED_SCALE / 2, y: target.y + FIXED_SCALE / 2 }
  const point = await page.evaluate((fixed) => {
    const canvas = document.querySelector('canvas')
    if (canvas === null) {
      throw new Error('no canvas')
    }
    const rect = canvas.getBoundingClientRect()
    const screen = window.__rtsDebug!.worldToScreen(fixed.x, fixed.y)
    return { x: rect.left + screen.x, y: rect.top + screen.y }
  }, clickTarget)
  await page.mouse.click(point.x, point.y)

  await expect
    .poll(() => page.evaluate(() => Object.values(window.__rtsDebug?.getConstructionStates() ?? {})[0] ?? null))
    .toMatchObject({ x: target.x, y: target.y, status: 'FOUNDATION' })
  await expect
    .poll(() => page.evaluate(() => Object.values(window.__rtsDebug?.getConstructionStates() ?? {})[0] ?? null), {
      timeout: 20_000
    })
    .toMatchObject({ x: target.x, y: target.y, status: 'COMPLETED' })
})
