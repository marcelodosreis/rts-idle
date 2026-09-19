import { expect, type Page, test } from '@playwright/test'
import { tilesToFixed } from '@rts/shared'

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

async function workerPosition(page: Page): Promise<{ readonly x: number; readonly y: number }> {
  return page.evaluate(() => {
    const position = Object.values(window.__rtsDebug?.getPositions() ?? {})[0]
    if (position === undefined) {
      throw new Error('economy Worker is missing')
    }
    return position
  })
}

async function workerId(page: Page): Promise<number> {
  return page.evaluate(() => Number(Object.keys(window.__rtsDebug?.getPositions() ?? {})[0]))
}

test('a player gathers, deposits, repeats, and stops through browser controls', async ({ page }) => {
  test.setTimeout(35_000)
  await page.goto('/?scenario=economy')
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1)).toBeGreaterThan(0)

  const mineralChip = page.getByText('Mineral', { exact: true }).locator('..')
  await expect(mineralChip).toContainText('0')

  const start = await workerPosition(page)
  const workerPoint = await canvasPointForFixed(page, start.x, start.y)
  await page.mouse.click(workerPoint.x, workerPoint.y)
  await expect(page.getByText('1 · Worker')).toBeVisible()

  const nodePoint = await canvasPointForFixed(page, tilesToFixed(10), tilesToFixed(8))
  await page.mouse.click(nodePoint.x, nodePoint.y, { button: 'right' })

  await expect.poll(async () => (await workerPosition(page)).x).toBe(tilesToFixed(10))
  await expect(page.getByTestId('economy-status')).toContainText('Mining')
  const id = await workerId(page)
  // Economy anims (gather/carry_run) only render when the tiny_swords art
  // pack is present (`pnpm run assets:prepare`); CI and a bare checkout run
  // without it, so every sprite renders as 'fallback' (see sprite-fallback.spec.ts).
  await expect
    .poll(() => page.evaluate((unitId) => window.__rtsDebug?.getSpriteState(unitId)?.anim, id))
    .toMatch(/^(gather|fallback)$/)
  await expect(page.getByTestId('economy-status')).toContainText('Returning', { timeout: 15_000 })
  await expect
    .poll(() => page.evaluate((unitId) => window.__rtsDebug?.getSpriteState(unitId)?.anim, id))
    .toMatch(/^(carry_run|fallback)$/)
  await expect(mineralChip).toContainText('10', { timeout: 20_000 })

  await expect
    .poll(async () => {
      const x = (await workerPosition(page)).x
      return x > tilesToFixed(6) && x < tilesToFixed(10)
    })
    .toBe(true)

  await page.getByRole('button', { name: 'Stop' }).click()
  await page.waitForTimeout(300)
  const stopped = await workerPosition(page)
  await page.waitForTimeout(700)
  expect(await workerPosition(page)).toEqual(stopped)
  await expect(mineralChip).toContainText('10')
  await expect(page.getByTestId('economy-status')).toHaveCount(0)
  await expect
    .poll(() => page.evaluate((unitId) => window.__rtsDebug?.getSpriteState(unitId)?.anim, id))
    .toMatch(/^(idle|fallback)$/)
})
