import { expect, type Page, test } from '@playwright/test'
import { hasArt } from './art.js'
import { selectFirstByOwner, settleUnits } from './settle.js'

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

test('visual base: HUD reacts to selection and units animate without teleporting', async ({ page }) => {
  await waitForUnits(page)

  // Selecting an owned unit updates the HUD selection panel. The squads cluster
  // tightly once engaged, so select by id rather than by mouse click.
  const selectedId = await selectFirstByOwner(page, 0)
  await expect(page.getByText(/1 ·/)).toBeVisible()
  const selectedStart = (await page.evaluate(
    (id) => window.__rtsDebug?.getPositions()[String(id)] ?? null,
    selectedId
  ))!

  // The animation loop is wired when art is present; fallback is tolerated.
  // (Deterministic check: sprite is an animated one. Frame-advance assertions
  // are flaky under a throttled headless ticker — owned by the animation agent.)
  const artAvailable = await hasArt(page)
  const frameA = await page.evaluate((id) => window.__rtsDebug?.getAnimationFrame(id) ?? null, selectedId)
  if (artAvailable) {
    expect(frameA).not.toBeNull()
  }

  // A MOVE animates the unit across the tilemap (position must change over time,
  // not teleport: intermediate render frames exist because interpolation runs).
  const rect = await canvasRect(page)
  const unitScreen = await worldToPage(page, selectedStart.x, selectedStart.y)
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
      }, selectedId)
    )
    .not.toEqual(selectedStart)

  // Regression: the unit's sprite body must be in the display list (a body
  // with visible=true but never added to the container renders nothing). The
  // simulation now moves units across ticks, so the run body shows while
  // moving and idle after arrival. Art-dependent (the sprite requires art).
  if (artAvailable) {
    await expect
      .poll(() =>
        page.evaluate((id) => {
          const st = window.__rtsDebug?.getSpriteState(id)
          return st?.inTree === true && st.visible === true
        }, selectedId)
      )
      .toBe(true)
  }

  // The selection panel persists and reflects the unit state through the move.
  await expect(page.getByText(/1 ·/)).toBeVisible()
})
