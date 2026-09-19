import { expect, test } from '@playwright/test'
import { selectFirstByOwner, settleUnits } from './settle.js'

test('hovering a selected HUD unit shows its details', async ({ page }) => {
  await settleUnits(page)
  await selectFirstByOwner(page, 0)

  const unitChip = page.locator('button[aria-label*="owner"]').first()
  await expect(unitChip).toBeVisible()
  await unitChip.hover()

  await expect(page.getByRole('tooltip')).toContainText(/Owner: P0/)
  await expect(page.getByRole('tooltip')).toContainText(/Status:/)
})
