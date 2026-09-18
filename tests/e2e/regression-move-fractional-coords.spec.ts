import { expect, type Page, test } from '@playwright/test'
import { selectFirstByOwner, settleUnits } from './settle.js'

// Regression: MOVE was silently rejected whenever the right-click produced
// fractional world coordinates (any real browser pointer event after pan/zoom).
// The demo transport never surfaced the rejection, so units never moved.
// See docs/postmortems/2026-09-16-move-rejected-fractional-coordinates.md

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

test('a MOVE with fractional world coordinates still moves the unit', async ({ page }) => {
  await settleUnits(page)
  // Select an owned unit by id: a mouse click can land on an overlapping enemy,
  // whose MOVE the server would reject (NOT_OWNER).
  const selectedId = await selectFirstByOwner(page, 0)
  const point = await page.evaluate((id) => window.__rtsDebug?.getPositions()[String(id)] ?? null, selectedId)
  const start = { x: point!.x, y: point!.y }

  // Offset the camera by a fractional amount — exactly what happens after real
  // panning/zooming. From then on, integer pixel clicks map to fractional world
  // coordinates, which is what a real browser produces.
  await page.evaluate(() => window.__rtsDebug!.moveCamera(2048.5, 2048.5))

  // Real right-click at integer screen pixels near the top-left corner →
  // fractional world target on open ground (away from the engaged cluster, so
  // the MOVE command is guaranteed to be issued).
  const rect = await canvasRect(page)
  const target = { x: rect.left + 80, y: rect.top + 80 }
  await page.mouse.click(target.x, target.y, { button: 'right' })

  // The command reached the renderer (ping) and the server accepted it (move).
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getPing() ?? null)).not.toBeNull()
  await expect
    .poll(() =>
      page.evaluate((id) => {
        const p = window.__rtsDebug?.getPositions()[String(id)]
        return p === undefined ? null : p
      }, selectedId)
    )
    .not.toEqual(start)
})
