import { expect, type Page, test } from '@playwright/test'

// Regression: MOVE was silently rejected whenever the right-click produced
// fractional world coordinates (any real browser pointer event after pan/zoom).
// The demo transport never surfaced the rejection, so units never moved.
// See docs/postmortems/2026-09-16-move-rejected-fractional-coordinates.md

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

test('a MOVE with fractional world coordinates still moves the unit', async ({ page }) => {
  const positions = await waitForUnits(page)
  const firstId = Object.keys(positions)[0]!
  const start = positions[firstId]!

  // Select the unit with a real click.
  const unitScreen = await worldToPage(page, start.x, start.y)
  await page.mouse.click(unitScreen.x, unitScreen.y)

  // Offset the camera by a fractional amount — exactly what happens after real
  // panning/zooming. From then on, integer pixel clicks map to fractional world
  // coordinates, which is what a real browser produces.
  await page.evaluate(() => window.__rtsDebug!.moveCamera(2048.5, 2048.5))

  // Real right-click at integer screen pixels → fractional world target.
  const rect = await canvasRect(page)
  const target = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  await page.mouse.click(target.x, target.y, { button: 'right' })

  // The command reached the renderer (ping) and the server accepted it (move).
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getPing() ?? null)).not.toBeNull()
  await expect
    .poll(() =>
      page.evaluate((id) => {
        const p = window.__rtsDebug?.getPositions()[String(id)]
        return p === undefined ? null : p
      }, firstId)
    )
    .not.toEqual(start)
})
