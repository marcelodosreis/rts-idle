import { expect, test } from '@playwright/test'
import { settleUnits } from '../support/settle.js'

test('the default scenario spawns five workers and five enemy pawns', async ({ page }) => {
  await page.goto('/')
  const positions = await settleUnits(page)
  expect(Object.keys(positions).length).toBe(10)
})

test('the optional 6v6 scenario spawns twelve units', async ({ page }) => {
  await page.goto('/?scenario=6v6&aggression=passive')
  const positions = await settleUnits(page)
  expect(Object.keys(positions).length).toBe(12)
})

test('the regression scenario preserves four economy workers', async ({ page }) => {
  await page.goto('/?scenario=regression')
  await settleUnits(page)
  const owners = await page.evaluate(() => window.__rtsDebug?.getUnitOwners() ?? {})
  expect(Object.values(owners).filter((owner) => owner === 0)).toHaveLength(4)
  expect(Object.values(owners).filter((owner) => owner === 1)).toHaveLength(0)
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
  // back, so a player unit stays at full health.
  await page.waitForTimeout(2000)
  const hp = await page.evaluate((id) => window.__rtsDebug?.getUnitHealth(id) ?? null, blueId)
  expect(hp).not.toBeNull()
  expect(hp!.current).toBe(hp!.max)
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
  const initial = await page.evaluate((id) => window.__rtsDebug?.getUnitHealth(id) ?? null, workerId)
  expect(initial).not.toBeNull()

  await expect
    .poll(() => page.evaluate((id) => window.__rtsDebug?.getUnitHealth(id)?.current ?? 0, workerId), {
      timeout: 15_000
    })
    .toBeLessThan(initial!.current)
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
  const positions = await settleUnits(page)
  expect(Object.keys(positions).length).toBe(4)
})

test('a failed local map keeps the server-provided scenario selector available', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('rts.playtestMap', JSON.stringify({ width: 1, height: 1, tiles: ['land'] }))
  })
  await page.goto('/?map=local')

  await page.getByRole('button', { name: 'Open DevTools menu' }).click()
  await page.getByRole('button', { name: 'Toggle Server Log' }).click()
  await page.getByRole('button', { name: 'Toggle Match session' }).click()
  await expect(page.getByText('scenario spawn is outside or on invalid terrain')).toBeVisible()
  await page.getByRole('combobox', { name: 'scenario' }).click()
  await expect(page.getByRole('option', { name: 'ffa' })).toBeVisible()
  await page.getByRole('option', { name: 'ffa' }).click()

  await expect.poll(() => new URL(page.url()).searchParams.get('map')).toBe('local')
  await expect.poll(() => new URL(page.url()).searchParams.get('scenario')).toBe('ffa')
})
