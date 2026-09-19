import { expect, type Page, test } from '@playwright/test'
import { tilesToFixed } from '@rts/shared'
import { hasArt } from './art.js'

async function canvasPointForFixed(page: Page, x: number, y: number) {
  return page.evaluate(
    ([fixedX, fixedY]) => {
      const canvas = document.querySelector('canvas')
      if (canvas === null) {
        throw new Error('no canvas')
      }
      const rect = canvas.getBoundingClientRect()
      const screen = window.__rtsDebug!.worldToScreen(fixedX, fixedY)
      return { x: rect.left + screen.x, y: rect.top + screen.y }
    },
    [x, y] as const
  )
}

async function workerIds(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const owners = window.__rtsDebug?.getUnitOwners() ?? {}
    return Object.entries(owners)
      .filter(([, owner]) => owner === 0)
      .map(([id]) => Number(id))
  })
}

async function workerPosition(page: Page, id: number): Promise<{ readonly x: number; readonly y: number }> {
  return page.evaluate((workerId) => {
    const position = window.__rtsDebug?.getPositions()[String(workerId)]
    if (position === undefined) {
      throw new Error('economy Worker is missing')
    }
    return position
  }, id)
}

test('a player gathers, deposits, repeats, and stops through browser controls', async ({ page }) => {
  test.setTimeout(35_000)
  await page.goto('/?scenario=economy')
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1)).toBeGreaterThan(0)

  const mineralChip = page.getByText('Mineral', { exact: true }).locator('..')
  await expect(mineralChip).toContainText('250')

  const workers = await workerIds(page)
  expect(workers).toHaveLength(4)
  const id = workers[0]!
  const start = await workerPosition(page, id)
  const workerPoint = await canvasPointForFixed(page, start.x, start.y)
  await page.mouse.click(workerPoint.x, workerPoint.y)
  await expect(page.getByText('1 · Worker')).toBeVisible()

  const nodePoint = await canvasPointForFixed(page, tilesToFixed(10), tilesToFixed(8))
  await page.mouse.click(nodePoint.x, nodePoint.y, { button: 'right' })

  await expect.poll(async () => (await workerPosition(page, id)).x).toBe(tilesToFixed(10))
  await expect(page.getByTestId('economy-status')).toContainText('Mining')
  // Economy anims (gather/carry_run) only render when the tiny_swords art pack
  // is present (`pnpm run assets:prepare`); CI and a bare checkout run without
  // it, so skip the anim check then (see art.ts / regression-units-visible.spec.ts).
  const art = await hasArt(page)
  if (art) {
    await expect
      .poll(() => page.evaluate((unitId) => window.__rtsDebug?.getSpriteState(unitId)?.anim, id))
      .toBe('gather')
  }
  await expect(page.getByTestId('economy-status')).toContainText('Returning', { timeout: 15_000 })
  if (art) {
    await expect
      .poll(() => page.evaluate((unitId) => window.__rtsDebug?.getSpriteState(unitId)?.anim, id))
      .toBe('carry_run')
  }
  await expect(mineralChip).toContainText('10', { timeout: 20_000 })

  await expect
    .poll(async () => {
      const x = (await workerPosition(page, id)).x
      return x > tilesToFixed(6) && x < tilesToFixed(10)
    })
    .toBe(true)

  await page.getByRole('button', { name: 'Stop' }).click()
  await page.waitForTimeout(300)
  const stopped = await workerPosition(page, id)
  await page.waitForTimeout(700)
  expect(await workerPosition(page, id)).toEqual(stopped)
  await expect(mineralChip).toContainText('10')
  await expect(page.getByTestId('economy-status')).toHaveCount(0)
  if (art) {
    await expect.poll(() => page.evaluate((unitId) => window.__rtsDebug?.getSpriteState(unitId)?.anim, id)).toBe('idle')
  }
})
