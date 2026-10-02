import { expect, test } from '@playwright/test'
import { tilesToFixed } from '@rts/shared'
import { hasArt } from '../support/art.js'
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

test('the default scenario spawns five workers and five enemy pawns', async ({ page }) => {
  await page.goto('/')
  const positions = await settleUnits(page)
  expect(Object.keys(positions).length).toBe(10)
})

test('the optional 8v8 scenario spawns sixteen units', async ({ page }) => {
  await page.goto('/?scenario=8v8&aggression=passive')
  const positions = await settleUnits(page)
  expect(Object.keys(positions).length).toBe(16)
})

test('the regression scenario preserves four economy workers', async ({ page }) => {
  await page.goto('/?scenario=regression')
  await settleUnits(page)
  const owners = await page.evaluate(() => window.__rtsDebug?.getUnitOwners() ?? {})
  expect(Object.values(owners).filter((owner) => owner === 0)).toHaveLength(4)
  expect(Object.values(owners).filter((owner) => owner === 1)).toHaveLength(0)
})

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
      .poll(() => page.evaluate((id) => window.__rtsDebug?.getSpriteState(id)?.anim, workerId), { timeout: 5_000 })
      .toMatch(/^repair_(run|interact)$/)
  }
  await expect
    .poll(() => page.evaluate((id) => window.__rtsDebug?.getConstructionStates()[id!]?.hp ?? 0, damagedBase), {
      timeout: 10_000
    })
    .toBeGreaterThan(250)
  await page.mouse.click(basePoint.x, basePoint.y)
  await expect(page.getByTestId('construction-health')).toContainText(/HP\s*\d+\/\d+/)
  if (await hasArt(page)) {
    await expect
      .poll(() => page.evaluate((id) => window.__rtsDebug?.getSpriteState(id)?.anim, workerId), { timeout: 10_000 })
      .toBe('repair_interact')
  }
  await expect
    .poll(() => page.evaluate((id) => window.__rtsDebug?.getConstructionStates()[id!]?.hp ?? 0, damagedBase), {
      timeout: 40_000
    })
    .toBe(500)
})

test('the ffa scenario spawns one unit per faction', async ({ page }) => {
  await page.goto('/?scenario=ffa')
  const positions = await settleUnits(page)
  expect(Object.keys(positions).length).toBe(4)
})

test('default passive enemies never damage the player', async ({ page }) => {
  await page.goto('/')
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

test('default scenario projects completed building health', async ({ page }) => {
  await page.goto('/?aggression=passive')
  await settleUnits(page)

  const buildings = await page.evaluate(() => window.__rtsDebug?.getConstructionStates() ?? {})
  const healthValues = Object.values(buildings)
    .map((building) => ({ hp: building.hp, maxHp: building.maxHp }))
    .filter((building): building is { hp: number; maxHp: number } => building.hp !== undefined)

  expect(healthValues).toEqual([
    { hp: 500, maxHp: 500 },
    { hp: 500, maxHp: 500 }
  ])
})

test('offensive default enemies eventually damage a player pawn', async ({ page }) => {
  await page.goto('/?scenario=default&aggression=offensive')
  expect(page.url()).toContain('aggression=offensive')
  await settleUnits(page)
  const workerId = await page.evaluate(() => {
    const owners = window.__rtsDebug?.getUnitOwners() ?? {}
    const entry = Object.entries(owners).find(([, owner]) => owner === 0)
    return entry === undefined ? null : Number(entry[0])
  })
  expect(workerId).not.toBeNull()
  if (workerId === null) {
    throw new Error('default scenario did not expose a worker')
  }
  const initial = await page.evaluate((id) => window.__rtsDebug?.getUnitHealth(id) ?? null, workerId)
  expect(initial).not.toBeNull()
  if (initial === null) {
    throw new Error('default scenario worker has no health state')
  }

  await expect
    .poll(() => page.evaluate((id) => window.__rtsDebug?.getUnitHealth(id)?.current ?? 0, workerId), {
      timeout: 15_000
    })
    .toBeLessThan(initial.current)
})

test('switching the scenario in the top bar reloads into the new match', async ({ page }) => {
  await page.goto('/')
  await settleUnits(page)
  expect(Object.keys(await page.evaluate(() => window.__rtsDebug?.getPositions() ?? {})).length).toBe(10)

  await page.getByRole('button', { name: 'Open DevTools menu' }).click()
  await page.getByRole('button', { name: 'Toggle Match session' }).click()
  await page.getByRole('combobox', { name: 'scenario' }).click()
  await page.getByRole('option', { name: 'ffa' }).click()

  await expect.poll(() => page.url()).toContain('scenario=ffa')
  await expect.poll(() => page.evaluate(() => Object.keys(window.__rtsDebug?.getPositions() ?? {}).length)).toBe(4)
  const positions = await settleUnits(page)
  expect(Object.keys(positions).length).toBe(4)
})

test('a failed local map keeps the server-provided scenario selector available', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'rts.playtestMap',
      JSON.stringify({ width: 1, height: 1, tiles: ['land'], resources: [] })
    )
  })
  await page.goto('/?map=local')

  await page.getByRole('button', { name: 'Open DevTools menu' }).click()
  await page.getByRole('button', { name: 'Toggle Server Log' }).click()
  await page.getByRole('button', { name: 'Toggle Match session' }).click()
  await expect(page.getByRole('alert')).toContainText('scenario spawn is outside or on invalid terrain')
  await page.getByRole('combobox', { name: 'scenario' }).click()
  await expect(page.getByRole('option', { name: 'ffa' })).toBeVisible()
  await page.getByRole('option', { name: 'ffa' }).click()

  await expect.poll(() => new URL(page.url()).searchParams.get('map')).toBe('local')
  await expect.poll(() => new URL(page.url()).searchParams.get('scenario')).toBe('ffa')
})
