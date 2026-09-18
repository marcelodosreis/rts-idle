import { expect, test } from '@playwright/test'
import { settleUnits } from './settle.js'

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

test('switching the scenario in the top bar reloads into the new match', async ({ page }) => {
  await page.goto('/')
  await settleUnits(page)
  expect(Object.keys(await page.evaluate(() => window.__rtsDebug?.getPositions() ?? {})).length).toBe(4)

  await page.getByRole('combobox', { name: 'scenario' }).click()
  await page.getByRole('option', { name: 'mixed' }).click()

  await expect.poll(() => page.url()).toContain('scenario=mixed')
  const positions = await settleUnits(page)
  expect(Object.keys(positions).length).toBe(4)
})
