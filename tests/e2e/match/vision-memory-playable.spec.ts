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

test('reveals an unknown region and retains explored memory through the real server', async ({ page }) => {
  test.setTimeout(50_000)
  await page.goto('/?scenario=default&aggression=passive&sprites=off')
  await waitForMatchReady(page)

  const targetTile = { x: 5, y: 20 }
  const targetIndex = targetTile.y * 32 + targetTile.x
  const initialFog = await page.evaluate(() => window.__rtsDebug!.getFog())
  expect(initialFog).not.toBeNull()
  expect(initialFog?.visibleTiles).not.toContain(targetIndex)
  expect(initialFog?.exploredTiles).not.toContain(targetIndex)

  const unitId = await selectFirstByOwner(page, 0)
  const startPosition = await page.evaluate((id) => window.__rtsDebug!.getPositions()[String(id)] ?? null, unitId)
  if (startPosition === null) {
    throw new Error(`missing starting position for unit ${unitId}`)
  }
  const target = { x: tilesToFixed(targetTile.x) + 128, y: tilesToFixed(targetTile.y) + 128 }
  await page.evaluate(([x, y]) => window.__rtsDebug!.moveCamera(x, y), [target.x, target.y] as const)
  await waitForStableCamera(page, target.x, target.y)
  const point = await canvasPointForFixed(page, target.x, target.y)
  await page.mouse.click(point.x, point.y, { button: 'right' })

  await expect
    .poll(
      () => page.evaluate((index) => window.__rtsDebug!.getFog()?.visibleTiles.includes(index) ?? false, targetIndex),
      {
        timeout: 25_000,
        intervals: [100, 250]
      }
    )
    .toBe(true)

  await expect
    .poll(
      () =>
        page.evaluate(
          ([id, expected]) => {
            const position = window.__rtsDebug!.getPositions()[String(id)]
            return position === undefined
              ? Number.POSITIVE_INFINITY
              : Math.max(Math.abs(position.x - expected.x), Math.abs(position.y - expected.y))
          },
          [unitId, target] as const
        ),
      { timeout: 15_000, intervals: [100, 250] }
    )
    .toBeLessThan(12)

  const revealedFog = await page.evaluate(() => window.__rtsDebug!.getFog())
  expect(revealedFog?.exploredTiles).toContain(targetIndex)

  await page.evaluate(([x, y]) => window.__rtsDebug!.moveCamera(x, y), [startPosition.x, startPosition.y] as const)
  await waitForStableCamera(page, startPosition.x, startPosition.y)
  const returnPoint = await canvasPointForFixed(page, startPosition.x, startPosition.y)
  await page.mouse.click(returnPoint.x, returnPoint.y, { button: 'right' })

  await expect
    .poll(
      () =>
        page.evaluate(
          ([id, expected]) => {
            const position = window.__rtsDebug!.getPositions()[String(id)]
            return position === undefined
              ? Number.POSITIVE_INFINITY
              : Math.max(Math.abs(position.x - expected.x), Math.abs(position.y - expected.y))
          },
          [unitId, startPosition] as const
        ),
      { timeout: 15_000, intervals: [100, 250] }
    )
    .toBeLessThan(12)

  await expect
    .poll(
      () =>
        page.evaluate((index) => !(window.__rtsDebug!.getFog()?.visibleTiles.includes(index) ?? false), targetIndex),
      { timeout: 10_000, intervals: [100, 250] }
    )
    .toBe(true)
  const retainedFog = await page.evaluate(() => window.__rtsDebug!.getFog())
  expect(retainedFog?.exploredTiles).toContain(targetIndex)
  const owners = await page.evaluate(() => window.__rtsDebug!.getUnitOwners())
  expect(Object.values(owners)).toEqual([0, 0, 0, 0, 0])
})
