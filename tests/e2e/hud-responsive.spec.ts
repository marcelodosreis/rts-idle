import { expect, test } from '@playwright/test'

const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 1440, height: 900 }
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
    await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1)).toBeGreaterThan(0)

    const doc = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }))
    expect(doc.scrollWidth).toBeLessThanOrEqual(doc.clientWidth + 1)

    const boxes = (await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid^="hud-topbar-"]')].map((el) => {
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
    expect(boxes.length).toBeGreaterThanOrEqual(3)
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
      clientWidth: el.clientWidth
    }))
    expect(footer.scrollWidth).toBeLessThanOrEqual(footer.clientWidth + 1)

    await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Surrender' })).toBeVisible()
    await page.getByRole('button', { name: 'Open DevTools menu' }).click()
    await page.getByRole('button', { name: 'Toggle Match session' }).click()
    await expect(page.getByLabel('scenario')).toBeVisible()
  })
}
