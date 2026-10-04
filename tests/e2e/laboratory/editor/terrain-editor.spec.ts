import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { watchAbortedModuleImports } from '../../support/aborted-module-imports.js'

async function openLaboratory(page: Page): Promise<void> {
  await page.goto('/laboratory')
  await expect(page.getByTestId('laboratory-page-title')).toHaveText('Asset Browser', { timeout: 20000 })
}

async function openEditor(page: Page): Promise<void> {
  await page.goto('/laboratory/editor')
  await page.locator('[data-testid="terrain-canvas-host"][data-controller-ready="true"]').waitFor()
}

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

test('terrain: rapid palette changes followed by navigation do not touch a destroyed scene', async ({ page }) => {
  const abortedImports = watchAbortedModuleImports(page)
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await openLaboratory(page)
  await openEditor(page)
  for (const palette of ['color2', 'color3', 'color4']) {
    await page.getByRole('combobox').first().click()
    await page.getByRole('option', { name: palette }).click()
  }
  await page.goto('/laboratory')
  await expect(page.getByTestId('laboratory-page-title')).toHaveText('Asset Browser', { timeout: 20000 })
  // Only the module import the browser actually aborted during navigation is a
  // harness artifact; a broken lazy import or missing chunk must still fail.
  const unexpected = pageErrors.filter((message) => !abortedImports.isKnownAbort(message))
  expect(unexpected).toEqual([])
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
  await expect.poll(() => new URL(game.url()).searchParams.get('scenario')).toBe('regression')
  await game.waitForFunction(() => window.__rtsDebug !== undefined, null, { timeout: 20000 })
  const info = await game.evaluate(() => window.__rtsDebug!.getMapInfo())
  expect(info.isPlaytest).toBe(true)
  expect(info.decorations).toBe(1)
})

test('terrain: playtest with a stale resume token opens the authored map', async ({ page }) => {
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
  // Guarantee the popup starts with a token from a previous match; the server
  // must reject the map mismatch and the client must fall back to the authored
  // local map instead of silently resuming the catalog match.
  await page.context().addInitScript(() => sessionStorage.setItem('rts-idle.resume-token', 'stale-token'))
  const popupPromise = page.waitForEvent('popup')
  await page.getByRole('button', { name: 'Playtest' }).click()
  const game = await popupPromise
  await game.waitForURL(/map=local/)
  await game.waitForFunction(() => window.__rtsDebug !== undefined, null, { timeout: 20000 })
  const info = await game.evaluate(() => window.__rtsDebug!.getMapInfo())
  expect(info.isPlaytest).toBe(true)
  expect(info.decorations).toBe(1)
  await expect.poll(() => game.evaluate(() => sessionStorage.getItem('rts-idle.resume-token'))).not.toBe('stale-token')
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
  // The editor autosaves on a debounce; poll the persisted map instead of
  // sleeping for the debounce window.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = window.localStorage.getItem('rts.editorLevel')
        if (raw === null) {
          return 0
        }
        try {
          const map = JSON.parse(raw) as { decorations?: readonly unknown[] }
          return map.decorations?.length ?? 0
        } catch {
          return 0
        }
      })
    )
    .toBeGreaterThan(0)
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
