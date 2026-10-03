import { expect, test } from '@playwright/test'
import { tilesToFixed } from '@rts/shared'
import { expectAnim, hasArt } from '../support/art.js'
import { settleUnits, waitForTicks } from '../support/settle.js'

async function canvasPointForFixed(page: import('@playwright/test').Page, x: number, y: number) {
  return page.evaluate(
    ([fixedX, fixedY]) => {
      const canvas = document.querySelector('canvas')
      if (canvas === null) {
        throw new Error('no canvas')
      }
      const rect = canvas.getBoundingClientRect()
      const screen = window.__rtsDebug!.worldToScreen(fixedX, fixedY)
      return { x: rect.left + screen.x, y: rect.top + screen.y }
    },
    [x, y] as const
  )
}

test('the regression scenario repairs its damaged Base through the browser command path', async ({ page }) => {
  test.setTimeout(55_000)
  await page.goto('/?scenario=regression')
  await settleUnits(page)
  const workerId = await page.evaluate(() => {
    const owners = window.__rtsDebug?.getUnitOwners() ?? {}
    return Number(Object.entries(owners).find(([, owner]) => owner === 0)![0])
  })
  const damagedBase = await page.evaluate(() => {
    const buildings = window.__rtsDebug?.getConstructionStates() ?? {}
    return Object.entries(buildings).find(([, building]) => building.hp === 250)?.[0] ?? null
  })
  expect(damagedBase).not.toBeNull()
  await page.evaluate((id) => window.__rtsDebug!.setSelection([id]), workerId)
  const basePoint = await canvasPointForFixed(page, tilesToFixed(7.5), tilesToFixed(7.5))
  await page.mouse.click(basePoint.x, basePoint.y, { button: 'right' })
  await expect
    .poll(() => page.evaluate((id) => window.__rtsDebug?.getSpriteState(id)?.facing, workerId), { timeout: 5_000 })
    .toBe(1)
  if (await hasArt(page)) {
    await expect
      .poll(() => expectAnim(page, workerId, ['repair_run', 'repair_interact']), { timeout: 5_000 })
      .not.toBeNull()
  }
  await expect
    .poll(() => page.evaluate((id) => window.__rtsDebug?.getConstructionStates()[id!]?.hp ?? 0, damagedBase), {
      timeout: 10_000
    })
    .toBeGreaterThan(250)
  await page.mouse.click(basePoint.x, basePoint.y)
  await expect(page.getByTestId('construction-health')).toContainText(/HP\s*\d+\/\d+/)
  if (await hasArt(page)) {
    await expect.poll(() => expectAnim(page, workerId, ['repair_interact']), { timeout: 10_000 }).not.toBeNull()
  }
  await expect
    .poll(() => page.evaluate((id) => window.__rtsDebug?.getConstructionStates()[id!]?.hp ?? 0, damagedBase), {
      timeout: 40_000
    })
    .toBe(500)
})

test('passive regression enemies never damage the player', async ({ page }) => {
  await page.goto('/?scenario=regression&aggression=passive')
  await settleUnits(page)
  const owners = await page.evaluate(() => window.__rtsDebug?.getUnitOwners() ?? {})
  const blueId = Number(Object.entries(owners).find(([, owner]) => owner === 0)![0])

  // The player's own units still fight, but the passive enemies never strike
  // back, so a player unit stays at full health. Observe real simulated time
  // (ticks), never wall-clock.
  await waitForTicks(page, 40)
  const hp = await page.evaluate((id) => window.__rtsDebug?.getUnitHealth(id) ?? null, blueId)
  expect(hp).not.toBeNull()
  expect(hp!.current).toBe(hp!.max)
})

test('regression projects completed building health', async ({ page }) => {
  await page.goto('/?scenario=regression&aggression=passive')
  await settleUnits(page)

  const buildings = await page.evaluate(() => window.__rtsDebug?.getConstructionStates() ?? {})
  const healthValues = Object.values(buildings)
    .map((building) => ({ hp: building.hp, maxHp: building.maxHp }))
    .filter((building): building is { hp: number; maxHp: number } => building.hp !== undefined)

  expect(healthValues).toHaveLength(3)
  expect(healthValues.map((building) => building.maxHp).sort((left, right) => left - right)).toEqual([250, 500, 500])
  expect(healthValues.map((building) => building.hp).sort((left, right) => left - right)).toEqual([250, 250, 500])
})

test('offensive regression enemies eventually damage a player pawn', async ({ page }) => {
  await page.goto('/?scenario=regression&aggression=offensive')
  expect(page.url()).toContain('aggression=offensive')
  await settleUnits(page)
  const workerId = await page.evaluate(() => {
    const owners = window.__rtsDebug?.getUnitOwners() ?? {}
    const entry = Object.entries(owners).find(([, owner]) => owner === 0)
    return entry === undefined ? null : Number(entry[0])
  })
  expect(workerId).not.toBeNull()
  if (workerId === null) {
    throw new Error('regression scenario did not expose a worker')
  }
  const initial = await page.evaluate((id) => window.__rtsDebug?.getUnitHealth(id) ?? null, workerId)
  expect(initial).not.toBeNull()
  if (initial === null) {
    throw new Error('regression scenario worker has no health state')
  }

  await expect
    .poll(() => page.evaluate((id) => window.__rtsDebug?.getUnitHealth(id)?.current ?? 0, workerId), {
      timeout: 15_000
    })
    .toBeLessThan(initial.current)
})
