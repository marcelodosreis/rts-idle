import { expect, test } from '@playwright/test'
import { settleUnits } from '../support/settle.js'

test('the win scenario finishes with a victory overlay and a restart', async ({ page }) => {
  // 3 blue pawns vs 1 red pawn: blue wins decisively.
  await page.goto('/?scenario=win')
  await settleUnits(page)

  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('dialog').getByText('Victory')).toBeVisible()

  // "New match" reloads into a fresh session: the overlay disappears and a new
  // match is running.
  await page.getByRole('button', { name: 'New match' }).click()
  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15_000 })
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1)).toBeGreaterThan(0)
})

test('the defeat scenario finishes with a defeat overlay', async ({ page }) => {
  // 1 blue pawn vs 3 red pawns: blue loses.
  await page.goto('/?scenario=defeat')
  await settleUnits(page)

  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('dialog').getByText('Defeat')).toBeVisible()
})
