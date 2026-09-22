import { expect, test } from '@playwright/test'

test('input profile is visible and persists across reloads', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByLabel('input profile')).toBeVisible()

  await page.getByLabel('input profile').click()
  await page.getByRole('option', { name: 'Trackpad' }).click()
  await expect(page.getByLabel('input profile')).toContainText('Trackpad')

  await page.reload()
  await expect(page.getByLabel('input profile')).toContainText('Trackpad')
  await expect(page.locator('canvas')).toHaveCSS('touch-action', 'none')
})
