import { expect, type Page, test } from '@playwright/test'
import { settleUnits } from './settle.js'

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

async function firstUnitScreen(page: Page) {
  const positions = await page.evaluate(() => window.__rtsDebug?.getPositions() ?? {})
  const firstId = Number(Object.keys(positions)[0])
  return { id: firstId, screen: await worldToPage(page, positions[String(firstId)]!.x, positions[String(firstId)]!.y) }
}

test('clicking a unit selects it and shows selection feedback', async ({ page }) => {
  await settleUnits(page)
  const { screen } = await firstUnitScreen(page)
  await page.mouse.click(screen.x, screen.y)

  // The squads cluster tightly once engaged, so the exact unit hit is
  // nondeterministic; what matters is that exactly one unit was selected and
  // the HUD reflects it.
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getSelection() ?? [])).toHaveLength(1)
  await expect(page.getByText(/1 ·/)).toBeVisible()
})

test('right-clicking with a selection issues a command and shows a ping', async ({ page }) => {
  await settleUnits(page)
  const { screen: unitScreen } = await firstUnitScreen(page)
  await page.mouse.click(unitScreen.x, unitScreen.y)

  const rect = await canvasRect(page)
  const targetScreen = {
    x: Math.min(unitScreen.x + 250, rect.left + rect.width - 20),
    y: Math.max(unitScreen.y - 40, rect.top + 20)
  }
  await page.mouse.click(targetScreen.x, targetScreen.y, { button: 'right' })

  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getPing() ?? null)).not.toBeNull()
})

test('dragging shows the selection rectangle until release', async ({ page }) => {
  await settleUnits(page)
  const { screen } = await firstUnitScreen(page)
  const start = { x: screen.x - 80, y: screen.y - 80 }
  const end = { x: screen.x + 80, y: screen.y + 80 }

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y)

  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getSelectionBoxState() ?? null))
    .toMatchObject({
      visible: true,
      width: 160,
      height: 160
    })

  await page.mouse.up()
  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getSelectionBoxState() ?? null))
    .toMatchObject({
      visible: false
    })
})
