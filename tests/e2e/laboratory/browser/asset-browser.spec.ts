import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { hasArt } from '../../support/art.js'

async function openLaboratory(page: Page): Promise<void> {
  await page.goto('/laboratory')
  await expect(page.getByTestId('laboratory-page-title')).toHaveText('Asset Browser', { timeout: 20000 })
}

async function openAssetBrowser(page: Page): Promise<void> {
  await openLaboratory(page)
  await page.waitForFunction(() => window.__spriteLab !== undefined, null, { timeout: 20000 })
  test.skip(!(await hasArt(page)), 'asset manifest not served (no art in CI)')
  await expect(page.getByRole('listbox', { name: 'Assets' })).toBeVisible({ timeout: 20000 })
  await expect(page.getByRole('option').first()).toBeVisible({ timeout: 20000 })
  await page.waitForFunction(() => window.__spriteLab?.ready === true, null, { timeout: 20000 })
}

test('sprite lab mounts the browse tab with art and all assets', async ({ page }) => {
  await openAssetBrowser(page)
  await expect(page.getByTestId('laboratory-page-title')).toHaveText('Asset Browser')
  await expect(page.getByPlaceholder('Search…')).toBeVisible()
  await expect(page.getByRole('listbox', { name: 'Assets' })).toBeVisible()
})

test('browse: the first asset of the selected type is auto-selected', async ({ page }) => {
  await openAssetBrowser(page)
  const inspector = page.getByRole('complementary', { name: 'Asset inspector' })
  await expect(page.locator('[role="option"][aria-selected="true"]')).toHaveCount(1)
  await expect(inspector).not.toContainText('select an asset')
  await page.getByRole('button', { name: /units/i }).click()
  await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected', 'true')
  await expect(inspector).toContainText('units.')
})

test('browse: the asset list keeps a minimum height when types expand', async ({ page }) => {
  await openAssetBrowser(page)
  await page.locator('[aria-label="Asset browser"] button:has(span:text-is("ui"))').click()
  const list = page.locator('[aria-label="Asset browser"] [data-slot="scroll-area"]').last()
  await expect(list).toBeVisible()
  await expect(page.getByRole('option').first()).toBeVisible()
  const box = await list.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.height).toBeGreaterThanOrEqual(300)
})

test('browse: selecting an asset renders the canvas and inspector', async ({ page }) => {
  await openAssetBrowser(page)
  await page.getByPlaceholder('Search…').fill('units.blue.pawn.pawn_idle')
  await page.getByRole('option', { name: /pawn_idle$/ }).click()
  await expect(page.getByText('units.blue.pawn.pawn_idle', { exact: false }).first()).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Asset inspector' })).toContainText('units.blue.pawn.pawn_idle')
})

test('browse: selecting a scrolled asset preserves the asset list position', async ({ page }) => {
  await openAssetBrowser(page)
  const viewport = page
    .locator('[aria-label="Asset browser"] [data-slot="scroll-area"]')
    .last()
    .locator('[data-radix-scroll-area-viewport]')
  await viewport.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  const before = await viewport.evaluate((element) => element.scrollTop)
  const target = page.getByRole('option').last()
  await target.click()
  const after = await viewport.evaluate((element) => element.scrollTop)

  expect(before).toBeGreaterThan(0)
  expect(after).toBeGreaterThanOrEqual(before - 2)
})

test('browse: sidebar search filters and selects a unique asset', async ({ page }) => {
  await openAssetBrowser(page)
  await page.getByPlaceholder('Search…').fill('rubber_duck')
  const item = page.getByRole('option', { name: 'rubber_duck' })
  await expect(item).toBeVisible()
  await item.click()
  await expect(page.getByRole('complementary', { name: 'Asset inspector' })).toContainText(
    'terrain.decorations.rubber_duck'
  )
})

test('browse: unique assets are present via search', async ({ page }) => {
  await openAssetBrowser(page)
  const search = page.getByPlaceholder('Search…')
  await search.fill('rock1')
  await expect(page.getByRole('option', { name: 'rock1' })).toBeVisible()
  await search.fill('stump')
  await expect(page.getByRole('option', { name: 'stump_1' })).toBeVisible()
})

test('browse: overlay toggle defaults off and toggles cleanly', async ({ page }) => {
  await openAssetBrowser(page)
  await page.getByPlaceholder('Search…').fill('buildings.blue.castle')
  await page.getByRole('option', { name: 'castle' }).click()
  await expect(page.getByRole('complementary', { name: 'Asset inspector' })).toContainText('buildings.blue.castle')
  await page.getByText('Overlays').click()
  const anchorLabel = page.locator('label', { hasText: 'Anchor + grid' })
  const anchorSwitch = anchorLabel.getByRole('switch')
  await expect(anchorSwitch).not.toBeChecked()
  await anchorSwitch.click()
  await expect(anchorSwitch).toBeChecked()
})

test('browse: multi-frame strips expose a slices grid with file + selected slice', async ({ page }) => {
  await openAssetBrowser(page)
  await page.getByPlaceholder('Search…').fill('fire_01')
  await page.getByRole('option', { name: 'fire_01' }).click()
  await expect(page.getByRole('complementary', { name: 'Asset inspector' })).toContainText('fx.fire_01')
  const slicesToggle = page.locator('label', { hasText: 'Show grid' }).getByRole('switch')
  await expect(slicesToggle).toBeVisible()
  await slicesToggle.click()
  await expect(page.getByRole('complementary', { name: 'Asset inspector' })).toContainText('8 slices')
  await expect(page.getByRole('complementary', { name: 'Asset inspector' })).toContainText('file:')
  await expect(page.getByRole('complementary', { name: 'Asset inspector' })).toContainText('selected: slice 1/8')
})

test('browse: asset list shows nested sub-headers within groups', async ({ page }) => {
  await openAssetBrowser(page)
  await page.getByRole('button', { name: /units/i }).click()
  await page.getByRole('button', { name: /blue/i }).click()
  await expect(page.getByText('archer', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('lancer', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('monk', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('pawn', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('warrior', { exact: true }).first()).toBeVisible()
  const archerIdle = page.getByRole('option', { name: 'archer_idle' })
  await archerIdle.click()
  await expect(page.getByRole('complementary', { name: 'Asset inspector' })).toContainText(
    'units.blue.archer.archer_idle'
  )
})
