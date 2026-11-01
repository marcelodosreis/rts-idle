import { expect, type Page, test } from '@playwright/test'

interface DocumentBounds {
  readonly clientHeight: number
  readonly clientWidth: number
  readonly scrollHeight: number
  readonly scrollWidth: number
}

const LABORATORY_ROUTES = [
  '/laboratory',
  '/laboratory/editor',
  '/laboratory/diagnostics',
  '/laboratory/report'
] as const
const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 656 },
  { label: 'mobile', width: 390, height: 844 }
] as const

async function documentBounds(page: Page): Promise<DocumentBounds> {
  return page.evaluate(() => ({
    clientHeight: document.documentElement.clientHeight,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth
  }))
}

async function expectViewportContent(page: Page): Promise<void> {
  await expect(page.locator('html')).toHaveClass(/\bdark\b/)
  const bounds = await documentBounds(page)
  expect(bounds.scrollHeight).toBeLessThanOrEqual(bounds.clientHeight + 1)
  expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.clientWidth + 1)
}

for (const viewport of VIEWPORTS) {
  for (const route of ['/', '/does-not-exist', ...LABORATORY_ROUTES] as const) {
    test(`${route} stays inside the ${viewport.label} viewport`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(route)
      if (route === '/') {
        await expect(page.getByTestId('home-page')).toBeVisible()
      } else if (route === '/does-not-exist') {
        await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
      } else {
        await expect(page.getByTestId('laboratory-page-title')).toBeVisible({ timeout: 20000 })
      }
      await expectViewportContent(page)
    })
  }
}

for (const viewport of VIEWPORTS) {
  test(`the match stays inside the ${viewport.label} viewport`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/?scenario=regression&aggression=passive')
    await expect(page.getByTestId('hud-root')).toBeVisible({ timeout: 30000 })
    await expectViewportContent(page)
  })
}
