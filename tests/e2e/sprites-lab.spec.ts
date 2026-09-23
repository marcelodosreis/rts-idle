import { expect, test } from '@playwright/test'
import { hasArt } from './art.js'

// E2E for the React + shadcn asset browser (/laboratory). The browser is an
// independent Laboratory route with sidebar search + categories, central Pixi
// canvas, and a shadcn inspector.
// Asset-browser assertions require the optional curated manifest. The rest of
// the Laboratory, including editor and terrain coverage, must run in fallback.

async function openLaboratory(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/laboratory')
  await expect(page.getByTestId('laboratory-page-title')).toHaveText('Asset Browser', { timeout: 20000 })
}

async function openAssetBrowser(page: import('@playwright/test').Page): Promise<void> {
  await openLaboratory(page)
  await page.waitForFunction(() => window.__spriteLab !== undefined, null, { timeout: 20000 })
  test.skip(!(await hasArt(page)), 'asset manifest not served (no art in CI)')
  await expect(page.getByRole('listbox', { name: 'Assets' })).toBeVisible({ timeout: 20000 })
  await expect(page.getByRole('option').first()).toBeVisible({ timeout: 20000 })
  await page.waitForFunction(() => window.__spriteLab?.ready === true, null, { timeout: 20000 })
}

async function openEditor(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/laboratory/editor')
  await page.locator('[data-testid="terrain-canvas-host"][data-controller-ready="true"]').waitFor()
}

test('sprite lab mounts the browse tab with art and all assets', async ({ page }) => {
  await openAssetBrowser(page)

  await expect(page.getByTestId('laboratory-page-title')).toHaveText('Asset Browser')

  // The sidebar lists assets (listbox role) and the search input is present.
  await expect(page.getByPlaceholder('Search…')).toBeVisible()
  await expect(page.getByRole('listbox', { name: 'Assets' })).toBeVisible()
})

test('browse: the first asset of the selected type is auto-selected', async ({ page }) => {
  await openAssetBrowser(page)

  // On mount an asset is auto-selected, so the canvas is never left empty.
  const inspector = page.getByRole('complementary', { name: 'Asset inspector' })
  await expect(page.locator('[role="option"][aria-selected="true"]')).toHaveCount(1)
  await expect(inspector).not.toContainText('select an asset')

  // Changing the selected type selects the first asset of that list.
  await page.getByRole('button', { name: /units/i }).click()
  await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected', 'true')
  await expect(inspector).toContainText('units.')
})

test('browse: the asset list keeps a minimum height when types expand', async ({ page }) => {
  await openAssetBrowser(page)

  // Expanding the category with the most subcategories used to squeeze the
  // asset list down to a sliver. The types section must shrink/scroll instead.
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

  // Readout is aria-live; wait for the asset summary to appear.
  await expect(page.getByText('units.blue.pawn.pawn_idle', { exact: false }).first()).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Asset inspector' })).toContainText('units.blue.pawn.pawn_idle')
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
  await openAssetBrowser(page)

  await page.getByPlaceholder('Search…').fill('fire_01')
  await page.getByRole('option', { name: 'fire_01' }).click()
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

test('laboratory routes mount the stress and report sections', async ({ page }) => {
  await openLaboratory(page)

  await page.goto('/laboratory/diagnostics')
  await expect(page.getByRole('heading', { name: 'Stress Test' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Stress Test' })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('zoom')

  await page.goto('/laboratory/report')
  await expect(page.getByTestId('laboratory-page-title')).toHaveText('Asset Report')
  await expect(page.getByText('Game contracts', { exact: false })).toBeVisible()
})

test('stress: camera pan/zoom is available with a reset', async ({ page }) => {
  await openLaboratory(page)

  await page.goto('/laboratory/diagnostics')
  await expect(page.getByRole('status')).toContainText('zoom')

  const reset = page.getByRole('button', { name: 'reset camera' })
  await expect(reset).toBeVisible()
})

test('stress: renderer host keeps a stable viewport height', async ({ page }) => {
  await openLaboratory(page)

  await page.goto('/laboratory/diagnostics')
  const host = page.getByTestId('stress-canvas-host')
  await expect(host).toBeVisible()
  await expect(host.locator('canvas')).toBeVisible()

  const initial = await host.boundingBox()
  expect(initial).not.toBeNull()
  expect(initial!.height).toBe(340)

  await expect.poll(async () => (await host.boundingBox())?.height ?? 0, { timeout: 5000 }).toBe(initial!.height)
})

test('terrain: playground mounts with paint controls and camera', async ({ page }) => {
  await openLaboratory(page)

  await page.goto('/laboratory/editor')
  await expect(page.getByRole('button', { name: /Grass/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Fit' })).toBeVisible()
  await expect(page.getByText(/Middle-drag to pan · wheel to zoom/)).toBeVisible()
})

test('terrain: cell grid overlay toggles', async ({ page }) => {
  await openLaboratory(page)

  await page.goto('/laboratory/editor')
  const gridToggle = page.getByRole('switch', { name: 'toggle cell grid' })
  await expect(gridToggle).toBeChecked()
  await gridToggle.click()
  await expect(gridToggle).not.toBeChecked()
  await gridToggle.click()
  await expect(gridToggle).toBeChecked()
})

test('terrain: status bar reports the hovered cell', async ({ page }) => {
  await openLaboratory(page)

  await openEditor(page)
  const cell = page.getByTestId('cursor-cell')
  await expect(cell).toHaveText('—')

  const host = page.getByTestId('terrain-canvas-host')
  const box = await host.boundingBox()
  if (box === null) {
    throw new Error('terrain canvas host has no bounding box')
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 })
  await expect(cell).not.toHaveText('—')
})

test('terrain: decoration palette enables every kind', async ({ page }) => {
  await openLaboratory(page)

  await page.goto('/laboratory/editor')
  await page.getByRole('tab', { name: 'Decor' }).click()
  const tree = page.getByRole('button', { name: /trees/ })
  await expect(tree).toBeEnabled()
  await tree.click()
  await expect(page.getByText('trees v0')).toBeVisible()
})

test('terrain: placed decoration round-trips through the game export', async ({ page }) => {
  await openLaboratory(page)

  await openEditor(page)
  await page.getByRole('tab', { name: 'Decor' }).click()
  await page.getByRole('button', { name: /trees/ }).click()

  const host = page.getByTestId('terrain-canvas-host')
  const box = await host.boundingBox()
  if (box === null) {
    throw new Error('terrain canvas host has no bounding box')
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)

  await page.getByRole('button', { name: 'Export' }).click()
  await page.getByRole('button', { name: 'Game' }).click()
  const textarea = page.locator('textarea')
  await expect(textarea).toHaveValue(/"decorations":\[/)
  await expect(textarea).toHaveValue(/"kind":"tree"/)
})

test('terrain: playtest opens the authored map in the game', async ({ page }) => {
  await openLaboratory(page)

  await openEditor(page)
  await page.getByRole('tab', { name: 'Decor' }).click()
  await page.getByRole('button', { name: /trees/ }).click()

  const host = page.getByTestId('terrain-canvas-host')
  const box = await host.boundingBox()
  if (box === null) {
    throw new Error('terrain canvas host has no bounding box')
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)

  const popupPromise = page.waitForEvent('popup')
  await page.getByRole('button', { name: 'Playtest' }).click()
  const game = await popupPromise
  await game.waitForURL(/map=local/)
  await game.waitForFunction(() => window.__rtsDebug !== undefined, null, { timeout: 20000 })
  const info = await game.evaluate(() => window.__rtsDebug!.getMapInfo())
  expect(info.isPlaytest).toBe(true)
  expect(info.decorations).toBe(1)
})

test('terrain: autosave restores the map after reload', async ({ page }) => {
  await openLaboratory(page)

  await openEditor(page)
  await page.getByRole('tab', { name: 'Decor' }).click()
  await page.getByRole('button', { name: /trees/ }).click()

  const host = page.getByTestId('terrain-canvas-host')
  const box = await host.boundingBox()
  if (box === null) {
    throw new Error('terrain canvas host has no bounding box')
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(700)

  await openLaboratory(page)
  await openEditor(page)
  await expect(page.getByText('Restored your saved map.')).toBeVisible()
})

test('terrain: upload rejects invalid json with a specific error', async ({ page }) => {
  await openLaboratory(page)

  await openEditor(page)
  await page.getByLabel('upload map json').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"width":0}')
  })
  await expect(page.getByText(/Invalid map:/)).toBeVisible()
})

test('terrain: download produces a map.json file', async ({ page }) => {
  await openLaboratory(page)

  await openEditor(page)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('map.json')
})

test('browse: asset list shows nested sub-headers within groups', async ({ page }) => {
  await openAssetBrowser(page)

  // Expand units and select the blue subcategory.
  await page.getByRole('button', { name: /units/i }).click()
  await page.getByRole('button', { name: /blue/i }).click()

  // The kind-level sub-headers (archer, lancer, monk, pawn, warrior) are visible.
  await expect(page.getByText('archer', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('lancer', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('monk', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('pawn', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('warrior', { exact: true }).first()).toBeVisible()

  // Selecting an item still works.
  const archerIdle = page.getByRole('option', { name: 'archer_idle' })
  await archerIdle.click()
  await expect(page.getByRole('complementary', { name: 'Asset inspector' })).toContainText(
    'units.blue.archer.archer_idle'
  )
})
