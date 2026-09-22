import { expect, type Page, test } from '@playwright/test'
import { hasArt } from './art.js'

// Regression coverage for the sprite lab responsive layout.
//
// The lab's Browse grid and Level Editor toolbar used to switch between the
// stacked mobile layout and the desktop layout only at `xl` (1280px). At
// 1278px — two pixels below the breakpoint — both views collapsed into the
// mobile stack. Below that (e.g. 910px) there was no tablet layout at all.
// These tests pin the tiered layout (2 columns from 768px, 3 columns from
// 1024px) and the host-driven canvas resize.
//
// The lab shell renders without art (the manifest resolves in fallback mode),
// so the layout assertions are CI-safe. Only the Level Editor canvas needs art.

const VIEWPORTS = [910, 1024, 1278, 1440] as const

async function openLab(page: Page, width: number, height = 900): Promise<void> {
  await page.setViewportSize({ width, height })
  await page.goto('/sprites/')
  await expect(page.getByRole('heading', { name: 'Sprite Lab' })).toBeVisible({ timeout: 20000 })
}

async function documentOverflow(page: Page): Promise<{ scrollWidth: number; clientWidth: number }> {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }))
}

for (const width of VIEWPORTS) {
  test(`sprite lab has no horizontal overflow at ${width}px`, async ({ page }) => {
    await openLab(page, width)

    const doc = await documentOverflow(page)
    expect(doc.scrollWidth).toBeLessThanOrEqual(doc.clientWidth + 1)
  })
}

test('browse keeps three columns at 1278px (just below xl)', async ({ page }) => {
  await openLab(page, 1278)

  const sidebar = await page.locator('[aria-label="Asset browser"]').boundingBox()
  const inspector = await page.locator('[aria-label="Asset inspector"]').boundingBox()
  expect(sidebar).not.toBeNull()
  expect(inspector).not.toBeNull()

  // Side by side: the inspector starts at/after the sidebar's right edge and
  // overlaps it vertically. In the old xl-only layout both stacked instead.
  expect(inspector!.x).toBeGreaterThanOrEqual(sidebar!.x + sidebar!.width - 1)
  expect(inspector!.y).toBeLessThan(sidebar!.y + sidebar!.height)
})

test('browse stacks into two rows at 910px (tablet)', async ({ page }) => {
  await openLab(page, 910)

  const sidebar = await page.locator('[aria-label="Asset browser"]').boundingBox()
  const inspector = await page.locator('[aria-label="Asset inspector"]').boundingBox()
  expect(sidebar).not.toBeNull()
  expect(inspector).not.toBeNull()

  // Tablet tier: inspector drops below the sidebar/canvas row, spanning both
  // columns, instead of squeezing into a third narrow column.
  expect(inspector!.y).toBeGreaterThanOrEqual(sidebar!.y + sidebar!.height - 1)
})

test('browse canvas shrinks with the host when the viewport narrows', async ({ page }) => {
  await openLab(page, 1440)

  const canvas = page.locator('canvas').first()
  const wide = await canvas.boundingBox()
  expect(wide).not.toBeNull()

  await page.setViewportSize({ width: 910, height: 900 })

  await expect
    .poll(async () => (await canvas.boundingBox())?.width ?? wide!.width, { timeout: 5000 })
    .toBeLessThan(wide!.width - 100)
})

test('level editor fits at 1278px and 910px', async ({ page }) => {
  await openLab(page, 1278)
  test.skip(!(await hasArt(page)), 'asset manifest not served (no art in CI)')

  await page.getByRole('tab', { name: 'Level Editor' }).click()
  await expect(page.locator('[data-testid="terrain-canvas-host"][data-controller-ready="true"]')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Playtest' })).toBeVisible()

  let doc = await documentOverflow(page)
  expect(doc.scrollWidth).toBeLessThanOrEqual(doc.clientWidth + 1)

  await page.setViewportSize({ width: 910, height: 900 })
  await expect(page.getByRole('button', { name: /Grass/ })).toBeVisible()
  doc = await documentOverflow(page)
  expect(doc.scrollWidth).toBeLessThanOrEqual(doc.clientWidth + 1)
})
