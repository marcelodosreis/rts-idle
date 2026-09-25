import { expect, type Page, test } from '@playwright/test'
import { selectFirstByOwner, settleUnits } from '../support/settle.js'

async function canvasRect(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (canvas === null) {
      throw new Error('no canvas')
    }
    const r = canvas.getBoundingClientRect()
    return { left: r.left, top: r.top, width: r.width, height: r.height }
  })
}

async function worldToPage(page: Page, x: number, y: number) {
  const rect = await canvasRect(page)
  const screen = await page.evaluate(([wx, wy]) => window.__rtsDebug!.worldToScreen(wx, wy), [x, y] as const)
  return { x: rect.left + screen.x, y: rect.top + screen.y }
}

test('selecting a unit and right-clicking moves it through the server', async ({ page }) => {
  await settleUnits(page)
  // The squads cluster tightly once engaged, so select an owned unit by id
  // (a mouse click can land on an overlapping enemy, which the server rejects).
  const selectedId = await selectFirstByOwner(page, 0)
  const start = await page.evaluate((id) => window.__rtsDebug?.getPositions()[String(id)] ?? null, selectedId)
  expect(start).not.toBeNull()

  const rect = await canvasRect(page)
  const unitScreen = await worldToPage(page, start!.x, start!.y)
  const targetScreen = {
    x: Math.min(unitScreen.x + 250, rect.left + rect.width - 20),
    y: Math.max(unitScreen.y - 40, rect.top + 20)
  }
  await page.mouse.click(targetScreen.x, targetScreen.y, { button: 'right' })

  // The authoritative server moves the entity; the replica must follow.
  await expect
    .poll(() =>
      page.evaluate((id) => {
        const p = window.__rtsDebug?.getPositions()[String(id)]
        return p === undefined ? null : p
      }, selectedId)
    )
    .not.toEqual(start)
})
