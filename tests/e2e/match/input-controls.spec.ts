import { expect, test } from '@playwright/test'
import { waitForMatchReady } from '../support/settle'

test('input profile is visible and persists across reloads', async ({ page }) => {
  await page.goto('/?scenario=regression&aggression=passive')
  await page.getByRole('button', { name: 'Open DevTools menu' }).click()
  await page.getByRole('button', { name: 'Toggle Match session' }).click()
  await expect(page.getByLabel('input profile')).toBeVisible()

  await page.getByLabel('input profile').click()
  await page.getByRole('option', { name: 'Trackpad' }).click()
  await expect(page.getByLabel('input profile')).toContainText('Trackpad')

  await page.reload()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByTestId('home-page')).toBeVisible()
  await page.getByRole('button', { name: 'Continue match' }).click()
  await waitForMatchReady(page)
  await page.getByRole('button', { name: 'Open DevTools menu' }).click()
  await page.getByRole('button', { name: 'Toggle Match session' }).click()
  await expect(page.getByLabel('input profile')).toContainText('Trackpad')
  await expect(page.locator('canvas')).toHaveCSS('touch-action', 'none')
})
