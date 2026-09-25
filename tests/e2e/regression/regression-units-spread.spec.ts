import { expect, type Page, test } from '@playwright/test'
import { settleUnits } from '../support/settle.js'

// Regression: moving several units to one point stacked them at identical
// coordinates, so they looked like a single unit. Destinations must be
// distinct (deterministic formation around the target).
// See docs/postmortems/2026-09-16-units-stacked-at-target.md

async function waitForUnits(page: Page) {
  return settleUnits(page)
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

async function visibleUnitIds(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (canvas === null) {
      throw new Error('no canvas')
    }
    const r = canvas.getBoundingClientRect()
    const positions = window.__rtsDebug?.getPositions() ?? {}
    return Object.keys(positions)
      .map(Number)
      .filter((id) => {
        const p = positions[String(id)]
        const s = window.__rtsDebug!.worldToScreen(p.x, p.y)
        const px = r.left + s.x
        const py = r.top + s.y
        return px >= r.left && px <= r.left + r.width && py >= r.top && py <= r.top + r.height
      })
      .sort((a, b) => a - b)
  })
}

test('box-selected units arrive spread out instead of stacked', async ({ page }) => {
  // The default 6v6 random demo is too volatile for a box-select regression;
  // use the small 2v2 scenario where the squads settle into a stable cluster.
  await page.goto('/?scenario=2v2')
  const positions = await waitForUnits(page)
  const ids = await visibleUnitIds(page)
  expect(ids.length).toBeGreaterThanOrEqual(2)

  // Box-select the visible cluster with a real drag on empty ground. The drag
  // stays safely inside the canvas (a drag ending flush with the bottom edge is
  // unreliable in headless — unrelated to the formation behavior under test).
  const rect = await canvasRect(page)
  const xs = ids.map((id) => positions[String(id)]!.x)
  const ys = ids.map((id) => positions[String(id)]!.y)
  const rawStart = await worldToPage(page, Math.min(...xs) - 100, Math.min(...ys) - 100)
  const rawEnd = await worldToPage(page, Math.max(...xs) + 100, Math.max(...ys) + 100)
  const start = {
    x: Math.max(rawStart.x, rect.left + 5),
    y: Math.max(rawStart.y, rect.top + 5)
  }
  const end = {
    x: Math.min(rawEnd.x, rect.left + rect.width - 60),
    y: Math.min(rawEnd.y, rect.top + rect.height - 60)
  }

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y, { steps: 5 })
  await page.mouse.up()

  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getSelection() ?? [])).toHaveLength(ids.length)

  // Move the whole selection to a single point.
  await page.mouse.click(rect.left + rect.width / 2, rect.top + rect.height / 2, { button: 'right' })

  // Every selected unit ends at a distinct position (the off-screen enemy units
  // are irrelevant here).
  await expect
    .poll(() =>
      page.evaluate((selectedIds) => {
        const current = window.__rtsDebug?.getPositions() ?? {}
        const keys = new Set(selectedIds.map((id) => `${current[String(id)]?.x},${current[String(id)]?.y}`))
        return keys.size
      }, ids)
    )
    .toBe(ids.length)
})
