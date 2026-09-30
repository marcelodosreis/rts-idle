import { expect, test } from '@playwright/test'
import { selectFirstByOwner, settleUnits } from '../support/settle.js'

test('opening a selected HUD unit shows its details', async ({ page }) => {
  await settleUnits(page)
  await selectFirstByOwner(page, 0)

  const details = page
    .getByRole('button', { name: /Details for Worker|Details for Soldier|Details for Ranger/ })
    .first()
  await expect(details).toBeVisible()
  await details.hover()

  await expect(page.getByText('Owner: P0', { exact: true })).toBeVisible()
  await expect(page.getByText(/Status:/)).toBeVisible()
})
