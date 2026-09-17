import { expect, type Page, test } from '@playwright/test'

async function waitForUnits(page: Page) {
  await page.goto('/')
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1)).toBeGreaterThan(0)
  const positions = await page.evaluate(() => window.__rtsDebug?.getPositions() ?? {})
  expect(Object.keys(positions).length).toBeGreaterThan(0)
  return positions
}

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
  const positions = await waitForUnits(page)
  const firstId = Object.keys(positions)[0]!
  const start = positions[firstId]!

  // Select the unit with a real click on its sprite.
  const unitScreen = await worldToPage(page, start.x, start.y)
  await page.mouse.click(unitScreen.x, unitScreen.y)

  // Right-click at a point that is guaranteed inside the canvas and away from the unit.
  const rect = await canvasRect(page)
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
      }, firstId)
    )
    .not.toEqual(start)
})
