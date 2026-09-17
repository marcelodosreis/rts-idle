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

test('clicking a unit selects it and shows selection feedback', async ({ page }) => {
  const positions = await waitForUnits(page)
  const firstId = Object.keys(positions)[0]!
  const unit = positions[firstId]!

  const screen = await worldToPage(page, unit.x, unit.y)
  await page.mouse.click(screen.x, screen.y)

  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getSelection() ?? [])).toContain(Number(firstId))
  await expect(page.getByText(/selected: 1/)).toBeVisible()
})

test('right-clicking with a selection issues a command and shows a ping', async ({ page }) => {
  const positions = await waitForUnits(page)
  const firstId = Object.keys(positions)[0]!
  const unit = positions[firstId]!

  const unitScreen = await worldToPage(page, unit.x, unit.y)
  await page.mouse.click(unitScreen.x, unitScreen.y)

  const rect = await canvasRect(page)
  const targetScreen = {
    x: Math.min(unitScreen.x + 250, rect.left + rect.width - 20),
    y: Math.max(unitScreen.y - 40, rect.top + 20)
  }
  await page.mouse.click(targetScreen.x, targetScreen.y, { button: 'right' })

  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getPing() ?? null)).not.toBeNull()
})
