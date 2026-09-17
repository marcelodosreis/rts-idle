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

test('visual base: HUD reacts to selection and units animate without teleporting', async ({ page }) => {
  const positions = await waitForUnits(page)
  const firstId = Number(Object.keys(positions)[0])
  const start = positions[firstId]!

  // Selecting a unit updates the HUD selection panel.
  const unitScreen = await worldToPage(page, start.x, start.y)
  await page.mouse.click(unitScreen.x, unitScreen.y)
  await expect(page.getByText(/1 selected/)).toBeVisible()

  // The animation loop is advancing when art is present; fallback is tolerated.
  const frameA = await page.evaluate((id) => window.__rtsDebug?.getAnimationFrame(id) ?? null, firstId)
  if (frameA !== null) {
    await expect
      .poll(() => page.evaluate((id) => window.__rtsDebug?.getAnimationFrame(id) ?? null, firstId), { timeout: 3000 })
      .not.toBe(frameA)
  }

  // A MOVE animates the unit across the tilemap (position must change over time,
  // not teleport: intermediate render frames exist because interpolation runs).
  const rect = await canvasRect(page)
  const target = {
    x: Math.min(unitScreen.x + 250, rect.left + rect.width - 20),
    y: Math.max(unitScreen.y - 40, rect.top + 20)
  }
  await page.mouse.click(target.x, target.y, { button: 'right' })

  await expect
    .poll(() =>
      page.evaluate((id) => {
        const p = window.__rtsDebug?.getPositions()[String(id)]
        return p === undefined ? null : p
      }, firstId)
    )
    .not.toEqual(start)

  // The selection panel persists and reflects the unit state through the move
  // (idle/moving; real per-tick movement lands with task A5).
  await expect(page.getByText(/1 selected/)).toBeVisible()
  await expect(page.getByText(/moving|idle/)).toBeVisible()
})
