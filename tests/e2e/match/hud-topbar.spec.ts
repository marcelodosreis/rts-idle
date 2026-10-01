import { expect, type Page, test } from '@playwright/test'
import { waitForMatchReady } from '../support/settle.js'

test.describe('top HUD', () => {
  async function topBarBoxes(page: Page) {
    return page.evaluate(() =>
      ['hud-topbar-brand', 'hud-topbar-stats', 'hud-topbar-time', 'hud-topbar-controls']
        .map((id) => document.querySelector(`[data-testid="${id}"]`))
        .filter((element): element is Element => element !== null)
        .map((element) => {
          const box = element.getBoundingClientRect()
          return {
            id: element.getAttribute('data-testid'),
            left: box.left,
            right: box.right,
            top: box.top,
            bottom: box.bottom
          }
        })
    )
  }

  test('shows the match clock and semantic resource colors on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/?scenario=default')
    await waitForMatchReady(page)

    await expect(page.getByTestId('hud-topbar-time')).toHaveText(/\d{2}:\d{2}/)
    await expect(page.getByTestId('hud-resource-mineral').locator('svg')).toHaveClass(/text-amber-400/)
    await expect(page.getByTestId('hud-resource-supply').locator('svg')).toHaveClass(/text-sky-400/)
    await expect(page.getByTestId('hud-resource-units').locator('svg')).toHaveClass(/text-emerald-400/)
    await expect(page.getByTestId('hud-resource-selected').locator('svg')).toHaveClass(/text-violet-400/)
    await expect(page.getByRole('button', { name: 'Surrender' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open DevTools menu' })).toBeVisible()
  })

  test('keeps the brand, resources, clock, and controls in two mobile rows', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/?scenario=default')
    await waitForMatchReady(page)

    const brand = await page.getByTestId('hud-topbar-brand').boundingBox()
    const stats = await page.getByTestId('hud-topbar-stats').boundingBox()
    const time = await page.getByTestId('hud-topbar-time').boundingBox()
    const controls = await page.getByTestId('hud-topbar-controls').boundingBox()
    expect(brand).not.toBeNull()
    expect(stats).not.toBeNull()
    expect(time).not.toBeNull()
    expect(controls).not.toBeNull()
    expect(brand?.y ?? 0).toBeLessThan(time?.y ?? 0)
    expect(stats?.y ?? 0).toBeLessThan(controls?.y ?? 0)

    const documentSize = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }))
    expect(documentSize.scrollWidth).toBeLessThanOrEqual(documentSize.clientWidth + 1)
    await expect(page.getByRole('button', { name: 'Surrender' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open DevTools menu' })).toBeVisible()
  })

  test('keeps the reference 958x910 layout clear and centered', async ({ page }) => {
    await page.setViewportSize({ width: 958, height: 910 })
    await page.goto('/?scenario=default')
    await waitForMatchReady(page)

    const boxes = await topBarBoxes(page)
    expect(boxes).toHaveLength(4)
    const time = boxes.find((box) => box.id === 'hud-topbar-time')
    expect(time).toBeDefined()
    expect(((time?.left ?? 0) + (time?.right ?? 0)) / 2).toBeCloseTo(958 / 2, 0)
    const regions = boxes.filter((box) => box.id !== 'hud-topbar-time')
    for (const region of regions) {
      const regionCenter = (region.top + region.bottom) / 2
      const timeCenter = ((time?.top ?? 0) + (time?.bottom ?? 0)) / 2
      expect(Math.abs(regionCenter - timeCenter)).toBeLessThan(4)
    }
    for (let index = 0; index < boxes.length; index += 1) {
      for (let next = index + 1; next < boxes.length; next += 1) {
        const current = boxes[index]!
        const other = boxes[next]!
        const overlaps =
          current.left < other.right &&
          other.left < current.right &&
          current.top < other.bottom &&
          other.top < current.bottom
        expect(overlaps, `${current.id} overlaps ${other.id}`).toBe(false)
      }
    }
  })
})
