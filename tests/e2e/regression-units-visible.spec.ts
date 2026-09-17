import { expect, type Page, test } from '@playwright/test'

// Regression: units were invisible after mount because the camera fit the
// entire (huge) world into the viewport, collapsing the scale to ~0.016.
// See docs/postmortems/2026-09-16-invisible-units.md

async function openWithUnits(page: Page) {
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

test('units are rendered at a visible zoom and inside the viewport', async ({ page }) => {
  const positions = await openWithUnits(page)
  const firstId = Object.keys(positions)[0]!
  const unit = positions[firstId]!

  // The initial zoom must keep units at a visible size (not fit-to-world scale).
  const zoom = await page.evaluate(() => window.__rtsDebug!.getZoom())
  expect(zoom).toBeGreaterThanOrEqual(0.9)

  // The unit's world position must map to a point inside the visible canvas.
  const rect = await canvasRect(page)
  const screen = await page.evaluate(([x, y]) => window.__rtsDebug!.worldToScreen(x, y), [unit.x, unit.y] as const)
  expect(screen.x).toBeGreaterThanOrEqual(rect.left)
  expect(screen.x).toBeLessThanOrEqual(rect.left + rect.width)
  expect(screen.y).toBeGreaterThanOrEqual(rect.top)
  expect(screen.y).toBeLessThanOrEqual(rect.top + rect.height)
})
