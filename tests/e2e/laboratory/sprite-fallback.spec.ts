import { expect, test } from '@playwright/test'
import { settleUnits } from '../support/settle.js'

test('the game remains playable with sprites disabled', async ({ page }) => {
  await page.goto('/?sprites=off')
  await settleUnits(page)

  await page.getByRole('button', { name: 'Open DevTools menu' }).click()
  await page.getByRole('button', { name: 'Toggle Match options' }).click()
  await expect(page.getByRole('switch', { name: 'toggle sprites' })).not.toBeChecked()
  const spriteState = await page.evaluate(() => {
    const positions = window.__rtsDebug?.getPositions() ?? {}
    const firstId = Number(Object.keys(positions)[0])
    return window.__rtsDebug?.getSpriteState(firstId)
  })
  expect(spriteState?.anim).toBe('fallback')

  await page.getByRole('switch', { name: 'toggle sprites' }).click()
  await expect.poll(() => new URL(page.url()).searchParams.has('sprites')).toBe(false)
})

test('fallback circles keep their size after units engage in combat', async ({ page }) => {
  await page.goto('/?scenario=6v6&aggression=offensive&sprites=off')
  await page.getByRole('button', { name: 'Open DevTools menu' }).click()
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1)).toBeGreaterThan(0)

  // Combat fires `attackFired`, which is what used to shrink the fallback body.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const ids = Object.keys(window.__rtsDebug?.getPositions() ?? {})
          for (const id of ids) {
            const health = window.__rtsDebug?.getUnitHealth(Number(id))
            if (health !== null && health !== undefined && health.current < health.max) {
              return true
            }
          }
          return false
        }),
      { timeout: 45_000 }
    )
    .toBe(true)

  const scales = await page.evaluate(() => {
    const ids = Object.keys(window.__rtsDebug?.getPositions() ?? {})
    return ids.map((id) => {
      const state = window.__rtsDebug?.getSpriteState(Number(id))
      return state === null || state === undefined ? null : { anim: state.anim, scale: state.scale }
    })
  })
  const fallbacks = scales.filter((state) => state?.anim === 'fallback')
  expect(fallbacks.length).toBeGreaterThan(0)
  for (const state of fallbacks) {
    expect(state?.scale).toBe(1)
  }
})

test('fallback units show kind-specific glyphs (P/W/A) and shapes', async ({ page }) => {
  await page.goto('/?scenario=6v6&aggression=offensive&sprites=off')
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1)).toBeGreaterThan(0)

  const glyphs = await page.evaluate(() => {
    const ids = Object.keys(window.__rtsDebug?.getPositions() ?? {})
    return ids.map((id) => {
      const state = window.__rtsDebug?.getSpriteState(Number(id))
      return state === null || state === undefined ? null : { anim: state.anim, glyph: state.glyph, shape: state.shape }
    })
  })
  const fallbacks = glyphs.filter((g) => g?.anim === 'fallback')
  expect(fallbacks.length).toBeGreaterThan(0)

  // Every fallback unit must have a glyph and shape.
  for (const g of fallbacks) {
    expect(g?.glyph).not.toBeNull()
    expect(g?.shape).not.toBeNull()
  }

  // The demo 6v6 has all three kinds.
  const letters = new Set(fallbacks.map((g) => g?.glyph))
  expect(letters).toEqual(new Set(['P', 'W', 'A']))
})
