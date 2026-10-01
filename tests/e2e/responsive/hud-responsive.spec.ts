import { expect, test } from '@playwright/test'
import { waitForMatchReady } from '../support/settle.js'

const VIEWPORTS = [
  { width: 800, height: 800 },
  { width: 958, height: 910 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1440, height: 1000 }
] as const

interface Box {
  readonly id: string
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

function intersects(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
}

for (const viewport of VIEWPORTS) {
  test(`HUD does not overlap or overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await waitForMatchReady(page)

    const hud = await page.getByTestId('hud-root').boundingBox()
    expect(hud).not.toBeNull()
    expect(hud?.width).toBe(viewport.width)
    expect(hud?.height).toBe(viewport.height)

    const gameSurface = await page.locator('[data-testid="match-host"]').boundingBox()
    expect(gameSurface).not.toBeNull()
    expect(gameSurface?.width).toBeLessThanOrEqual(958)
    expect(gameSurface?.height).toBeLessThanOrEqual(910)

    const doc = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }))
    expect(doc.scrollWidth).toBeLessThanOrEqual(doc.clientWidth + 1)

    const boxes = (await page.evaluate(() =>
      ['hud-topbar-brand', 'hud-topbar-stats', 'hud-topbar-time', 'hud-topbar-controls']
        .map((id) => document.querySelector(`[data-testid="${id}"]`))
        .filter((element): element is Element => element !== null)
        .map((el) => {
          const r = el.getBoundingClientRect()
          return {
            id: el.getAttribute('data-testid')!,
            left: r.left,
            top: r.top,
            right: r.right,
            bottom: r.bottom
          }
        })
    )) as Box[]
    expect(boxes).toHaveLength(4)
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!
        const b = boxes[j]!
        expect(intersects(a, b), `${a.id} overlaps ${b.id}`).toBe(false)
      }
    }

    for (const box of boxes) {
      expect(box.left).toBeGreaterThanOrEqual(0)
      expect(box.right).toBeLessThanOrEqual(viewport.width + 1)
    }

    const footer = await page.locator('footer').evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight
    }))
    expect(footer.scrollWidth).toBeLessThanOrEqual(footer.clientWidth + 1)
    expect(footer.scrollHeight).toBeLessThanOrEqual(footer.clientHeight + 1)
    const footerBox = await page.locator('footer').boundingBox()
    expect(footerBox).not.toBeNull()
    expect(footerBox?.width).toBe(viewport.width)
    expect(footerBox?.height).toBeLessThanOrEqual(240)
    const footerContentBox = await page.locator('footer > div').boundingBox()
    expect(footerContentBox).not.toBeNull()
    expect(footerContentBox?.width).toBeLessThanOrEqual(958)

    const cards = page.locator(
      '[data-testid="overview-card"], [data-testid="current-context-card"], [data-testid="command-card"]'
    )
    await expect(cards).toHaveCount(3)
    const minimap = page.getByTestId('minimap-placeholder')
    const minimapBox = await minimap.boundingBox()
    expect(minimapBox).not.toBeNull()
    expect(Math.abs((minimapBox?.width ?? 0) - (minimapBox?.height ?? 0))).toBeLessThan(1)

    const slots = page.locator('[data-testid^="command-slot-"]')
    await expect(slots).toHaveCount(9)
    await expect(page.locator('[data-command-id]')).toHaveCount(0)

    await expect(page.getByRole('button', { name: 'Surrender' })).toBeVisible()
    await page.getByRole('button', { name: 'Open DevTools menu' }).click()
    await page.getByRole('button', { name: 'Toggle Match session' }).click()
    await expect(page.getByLabel('scenario')).toBeVisible()
  })
}
