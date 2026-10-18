import { expect, type Page, test } from '@playwright/test'
import { tilesToFixed } from '@rts/shared'
import { selectFirstByOwner, waitForMatchReady, waitForStableCamera } from '../support/settle.js'

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

async function moveSelectedUnit(page: Page, target: { readonly x: number; readonly y: number }): Promise<void> {
  await page.evaluate(([x, y]) => window.__rtsDebug!.moveCamera(x, y), [target.x, target.y] as const)
  await waitForStableCamera(page, target.x, target.y)
  const point = await canvasPointForFixed(page, target.x, target.y)
  await page.mouse.click(point.x, point.y, { button: 'right' })
}

async function distanceFromTarget(page: Page, unitId: number, target: { readonly x: number; readonly y: number }) {
  return page.evaluate(
    ([id, expected]) => {
      const position = window.__rtsDebug!.getPositions()[String(id)]
      return position === undefined
        ? Number.POSITIVE_INFINITY
        : Math.max(Math.abs(position.x - expected.x), Math.abs(position.y - expected.y))
    },
    [unitId, target] as const
  )
}

test('filters an enemy as it enters and leaves the player vision', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/?scenario=default&aggression=passive&sprites=off')
  await waitForMatchReady(page)

  const unitId = await selectFirstByOwner(page, 0)
  const startPosition = await page.evaluate((id) => window.__rtsDebug!.getPositions()[String(id)] ?? null, unitId)
  if (startPosition === null) {
    throw new Error(`missing starting position for unit ${unitId}`)
  }
  const enemyRegion = { x: tilesToFixed(21) + 128, y: tilesToFixed(27) + 128 }
  await moveSelectedUnit(page, enemyRegion)

  await expect
    .poll(() => distanceFromTarget(page, unitId, enemyRegion), { timeout: 30_000, intervals: [100, 250] })
    .toBeLessThan(12)
  await expect
    .poll(() => page.evaluate(() => Object.values(window.__rtsDebug!.getUnitOwners()).includes(1)), {
      timeout: 10_000,
      intervals: [100, 250]
    })
    .toBe(true)

  await moveSelectedUnit(page, startPosition)
  await expect
    .poll(() => distanceFromTarget(page, unitId, startPosition), { timeout: 20_000, intervals: [100, 250] })
    .toBeLessThan(12)
  await expect
    .poll(() => page.evaluate(() => Object.values(window.__rtsDebug!.getUnitOwners()).every((owner) => owner === 0)), {
      timeout: 10_000,
      intervals: [100, 250]
    })
    .toBe(true)
})
