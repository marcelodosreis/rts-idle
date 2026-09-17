import { expect, test } from '@playwright/test'
import { hasArt } from './art.js'

// E2E for the React + shadcn sprite lab (/sprites/). The page is a tab shell
// (Browse / Terrain / Stress / Report) with a unified asset browser: sidebar
// search + categories, central Pixi canvas, and a shadcn inspector. The debug
// hook window.__spriteLab exposes programmatic selection + the active tab.
// Every test needs art (the lab browses real assets), so skip when the asset
// manifest is not served (CI has no assets; ADR-015 CI-safe-without-art).

async function openLab(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/sprites/')
  await page.waitForFunction(() => window.__spriteLab !== undefined, null, { timeout: 20000 })
  test.skip(!(await hasArt(page)), 'asset manifest not served (no art in CI)')
}

test('sprite lab mounts the browse tab with art and all assets', async ({ page }) => {
  await openLab(page)

  await expect(page.getByRole('heading', { name: 'Sprite Lab' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Browse' })).toHaveAttribute('data-state', 'active')
  await expect(page.getByRole('tab', { name: 'Stress' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Level Editor' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Report' })).toBeVisible()

  // The sidebar lists assets (listbox role) and the search input is present.
  await expect(page.getByPlaceholder('Search…')).toBeVisible()
  await expect(page.getByRole('listbox', { name: 'Assets' })).toBeVisible()
})

test('browse: selecting an asset via the hook renders the canvas and inspector', async ({ page }) => {
  await openLab(page)

  await page.evaluate(() => window.__spriteLab!.browse('units.blue.pawn.pawn_idle'))

  // Readout is aria-live; wait for the asset summary to appear.
  await expect(page.getByText('units.blue.pawn.pawn_idle', { exact: false }).first()).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Asset inspector' })).toContainText('units.blue.pawn.pawn_idle')
})

test('browse: sidebar search filters and selects a unique asset', async ({ page }) => {
  await openLab(page)

  await page.getByPlaceholder('Search…').fill('rubber_duck')
  const item = page.getByRole('option', { name: 'rubber_duck' })
  await expect(item).toBeVisible()
  await item.click()
  await expect(page.getByRole('complementary', { name: 'Asset inspector' })).toContainText(
    'terrain.decorations.rubber_duck'
  )
})

test('browse: unique assets are present via search', async ({ page }) => {
  await openLab(page)

  const search = page.getByPlaceholder('Search…')
  await search.fill('rock1')
  await expect(page.getByRole('option', { name: 'rock1' })).toBeVisible()
  await search.fill('stump')
  await expect(page.getByRole('option', { name: 'stump_1' })).toBeVisible()
})

test('browse: overlay toggle defaults off and toggles cleanly', async ({ page }) => {
  await openLab(page)

  await page.evaluate(() => window.__spriteLab!.browse('buildings.blue.castle'))
  await expect(page.getByRole('complementary', { name: 'Asset inspector' })).toContainText('buildings.blue.castle')

  // Open the Overlays section first
  await page.getByText('Overlays').click()

  // shadcn Switch is a <button role="switch"> inside a <label> with the caption.
  const anchorLabel = page.locator('label', { hasText: 'Anchor + grid' })
  const anchorSwitch = anchorLabel.getByRole('switch')
  await expect(anchorSwitch).not.toBeChecked()
  await anchorSwitch.click()
  await expect(anchorSwitch).toBeChecked()
})

test('browse: multi-frame strips expose a slices grid with file + selected slice', async ({ page }) => {
  await openLab(page)

  await page.evaluate(() => window.__spriteLab!.browse('fx.fire_01'))
  await expect(page.getByRole('complementary', { name: 'Asset inspector' })).toContainText('fx.fire_01')

  // Slices toggle appears for multi-frame assets and switches to the grid.
  const slicesToggle = page.locator('label', { hasText: 'Show grid' }).getByRole('switch')
  await expect(slicesToggle).toBeVisible()
  await slicesToggle.click()
  await expect(page.getByRole('complementary', { name: 'Asset inspector' })).toContainText('8 slices')

  // The readout identifies the file and the selected slice.
  await expect(page.getByRole('complementary', { name: 'Asset inspector' })).toContainText('file:')
  await expect(page.getByRole('complementary', { name: 'Asset inspector' })).toContainText('selected: slice 1/8')
})

test('tabs: switching to Stress and Report mounts their sections', async ({ page }) => {
  await openLab(page)

  await page.getByRole('tab', { name: 'Stress' }).click()
  await expect(page.getByRole('tab', { name: 'Stress' })).toHaveAttribute('data-state', 'active')
  await expect(page.getByRole('status')).toContainText('zoom')

  await page.getByRole('tab', { name: 'Report' }).click()
  await expect(page.getByRole('tab', { name: 'Report' })).toHaveAttribute('data-state', 'active')
  await expect(page.getByText('Game contracts', { exact: false })).toBeVisible()
})

test('stress: camera pan/zoom is available with a reset', async ({ page }) => {
  await openLab(page)

  await page.getByRole('tab', { name: 'Stress' }).click()
  await expect(page.getByRole('status')).toContainText('zoom')

  const reset = page.getByRole('button', { name: 'reset camera' })
  await expect(reset).toBeVisible()
})

test('terrain: playground mounts with paint controls and camera', async ({ page }) => {
  await openLab(page)

  await page.getByRole('tab', { name: 'Level Editor' }).click()
  await expect(page.getByRole('tab', { name: 'Level Editor' })).toHaveAttribute('data-state', 'active')
  await expect(page.getByText('Brush')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reset Canvas' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Fit view' })).toBeVisible()
  await expect(page.getByText(/Middle-drag to pan · wheel to zoom/)).toBeVisible()
})
