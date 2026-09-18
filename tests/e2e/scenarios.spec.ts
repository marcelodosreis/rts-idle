import { expect, test } from '@playwright/test'
import { settleUnits } from './settle.js'

test('the default 6v6 random scenario spawns twelve units', async ({ page }) => {
  await page.goto('/')
  const positions = await settleUnits(page)
  expect(Object.keys(positions).length).toBe(12)
})

test('a bigger scenario spawns more units', async ({ page }) => {
  await page.goto('/?scenario=4v4')
  const positions = await settleUnits(page)
  expect(Object.keys(positions).length).toBe(8)
})

test('the ffa scenario spawns one unit per faction', async ({ page }) => {
  await page.goto('/?scenario=ffa')
  const positions = await settleUnits(page)
  expect(Object.keys(positions).length).toBe(4)
})

test('passive enemies never damage the player', async ({ page }) => {
  await page.goto('/?aggression=passive')
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

test('switching the scenario in the top bar reloads into the new match', async ({ page }) => {
  await page.goto('/')
  await settleUnits(page)
  expect(Object.keys(await page.evaluate(() => window.__rtsDebug?.getPositions() ?? {})).length).toBe(12)

  await page.getByRole('combobox', { name: 'scenario' }).click()
  await page.getByRole('option', { name: 'mixed' }).click()

  await expect.poll(() => page.url()).toContain('scenario=mixed')
  const positions = await settleUnits(page)
  expect(Object.keys(positions).length).toBe(4)
})
