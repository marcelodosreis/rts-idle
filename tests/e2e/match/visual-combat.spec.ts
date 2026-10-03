import { expect, type Page, test } from '@playwright/test'
import { waitForMatchReady } from '../support/settle.js'

async function waitForUnits(page: Page) {
  await page.goto('/?scenario=regression&aggression=offensive')
  await waitForMatchReady(page)
  const positions = await page.evaluate(() => window.__rtsDebug?.getPositions() ?? {})
  expect(Object.keys(positions).length).toBeGreaterThan(0)
  return positions
}

test('visual combat: damaged units show a health bar and combat resolves kills', async ({ page }) => {
  test.setTimeout(90_000)
  const positions = await waitForUnits(page)
  const initialCount = Object.keys(positions).length
  expect(initialCount).toBeGreaterThan(0)

  // The hostile demo's squads engage each other: at least one unit must take
  // damage (its overhead HP bar appears when hp < max).
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const ids = Object.keys(window.__rtsDebug?.getPositions() ?? {})
          for (const id of ids) {
            const health = window.__rtsDebug?.getUnitHealth(Number(id))
            if (health !== null && health !== undefined && health.current < health.max) {
              return { damaged: true, hp: health.current, max: health.max }
            }
          }
          return null
        }),
      { timeout: 45_000 }
    )
    .not.toBeNull()

  // Combat must resolve: some unit dies, so the unit count drops.
  await expect
    .poll(() => page.evaluate(() => Object.keys(window.__rtsDebug?.getPositions() ?? {}).length), { timeout: 60_000 })
    .toBeLessThan(initialCount)
})
