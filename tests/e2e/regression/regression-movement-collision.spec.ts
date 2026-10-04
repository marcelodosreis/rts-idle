import { expect, type Page, test } from '@playwright/test'
import { tilesToFixed } from '@rts/shared'
import {
  selectByIds,
  selectFirstByOwner,
  settleUnits,
  waitForMatchReady,
  waitForStableCamera
} from '../support/settle.js'

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

async function expectPositionNear(
  page: Page,
  unitId: number,
  target: { readonly x: number; readonly y: number },
  timeout: number
): Promise<void> {
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
      { timeout }
    )
    .toBeLessThanOrEqual(8)
}

test('right-click movement routes around the regression House through the real server', async ({ page }) => {
  test.setTimeout(35_000)
  // All automated gameplay E2E uses the unified regression fixture.
  await page.goto('/?scenario=regression&aggression=passive&sprites=off')
  await waitForMatchReady(page)
  await settleUnits(page)

  const unitId = await selectFirstByOwner(page, 0)
  await selectByIds(page, [unitId])
  const start = await page.evaluate((id) => window.__rtsDebug!.getPositions()[String(id)]!, unitId)
  const target = { x: tilesToFixed(20) + 128, y: tilesToFixed(14) + 128 }
  await page.evaluate(([x, y]) => window.__rtsDebug!.moveCamera(x, y), [target.x, target.y] as const)
  await waitForStableCamera(page, target.x, target.y)
  const targetPoint = await canvasPointForFixed(page, target.x, target.y)
  await page.mouse.click(targetPoint.x, targetPoint.y, { button: 'right' })

  await expectPositionNear(page, unitId, target, 15_000)
  expect(start).not.toEqual(target)
})
