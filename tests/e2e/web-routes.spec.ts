import { expect, test } from '@playwright/test'

const laboratoryRoutes = [
  ['/laboratory', 'Asset Browser'],
  ['/laboratory/editor', 'Map Editor'],
  ['/laboratory/diagnostics', 'Diagnostics'],
  ['/laboratory/report', 'Asset Report']
] as const

for (const [route, heading] of laboratoryRoutes) {
  test(`loads ${route} directly and after refresh`, async ({ page }) => {
    await page.goto(route)
    await expect(page.getByRole('heading', { name: 'RTS Idle Laboratory', exact: true })).toBeVisible({
      timeout: 20000
    })
    await expect(page.getByTestId('laboratory-page-title')).toHaveText(heading, { timeout: 20000 })
    await page.reload()
    await expect(page.getByRole('heading', { name: 'RTS Idle Laboratory', exact: true })).toBeVisible({
      timeout: 20000
    })
    await expect(page.getByTestId('laboratory-page-title')).toHaveText(heading, { timeout: 20000 })
  })
}

test('the match exposes laboratory navigation in the top bar', async ({ page }) => {
  test.setTimeout(90000)
  await page.goto('/')
  await page.getByRole('button', { name: 'Open DevTools menu' }).click()
  await page.getByRole('link', { name: 'Open Laboratory' }).click()
  await expect(page).toHaveURL(/\/laboratory$/)
  await expect(page.getByTestId('laboratory-page-title')).toHaveText('Asset Browser', { timeout: 60000 })
  await expect(page.getByTestId('route-content-error')).toHaveCount(0)
  await expect(page.getByTestId('route-loading')).toHaveCount(0)
})

test('laboratory navigation commits while the match is updating under load', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CPU throttling uses the Chromium DevTools protocol')
  test.setTimeout(120000)
  const client = await page.context().newCDPSession(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Open DevTools menu' }).click()
  await client.send('Emulation.setCPUThrottlingRate', { rate: 20 })
  await page.getByRole('link', { name: 'Open Laboratory' }).click()
  await expect(page).toHaveURL(/\/laboratory$/)
  await expect(page.getByTestId('laboratory-page-title')).toHaveText('Asset Browser', { timeout: 30000 })
})

test('laboratory menu groups match settings and keeps laboratory as its final action', async ({ page }) => {
  await page.goto('/')
  const devTools = page.getByRole('button', { name: 'Open DevTools menu' })
  await devTools.click()

  const triggerBox = await devTools.boundingBox()
  const contentBox = await page.locator('[data-slot="popover-content"]').boundingBox()
  expect(triggerBox).not.toBeNull()
  expect(contentBox).not.toBeNull()
  const viewportWidth = await page.evaluate(() => window.innerWidth)
  expect(contentBox!.x).toBeGreaterThanOrEqual(0)
  expect(contentBox!.x + contentBox!.width).toBeLessThanOrEqual(viewportWidth)

  await expect(page.getByRole('button', { name: 'Toggle Match session' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Toggle Match session' })).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByRole('button', { name: 'Toggle Match options' })).toHaveAttribute('aria-expanded', 'false')
  await page.getByRole('button', { name: 'Toggle Match session' }).click()
  await expect(page.getByLabel('scenario')).toBeVisible()
  await expect(page.getByLabel('input profile')).toBeVisible()
  await page.getByRole('button', { name: 'Toggle Match options' }).click()
  await expect(page.getByRole('switch', { name: 'toggle sprites' })).toBeVisible()
  await expect(page.getByRole('switch', { name: 'toggle enemy aggression' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open Laboratory' })).toBeVisible()
})

test('match popovers stay open until their own trigger is clicked again', async ({ page }) => {
  await page.goto('/')

  const gameDevTools = page.getByRole('button', { name: 'Open DevTools menu' })
  await gameDevTools.click()
  const serverLog = page.getByRole('button', { name: 'Toggle Server Log' })
  await expect(serverLog).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByText(/Tick: \d+/)).toBeVisible()
  await expect(page.locator('#game-devtools-log-content')).toBeHidden()
  await serverLog.click()
  await expect(serverLog).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('#game-devtools-log-content')).toBeVisible()
  await page.locator('body').click({ position: { x: 20, y: 700 } })
  await expect(page.locator('#game-devtools-log-content')).toBeVisible()
  await gameDevTools.click()
  await expect(page.locator('#game-devtools-log-content')).toBeHidden()
})

test('laboratory pages expose navigation with the current page highlighted', async ({ page }) => {
  await page.goto('/laboratory/editor')
  const navigation = page.getByRole('navigation', { name: 'Laboratory pages' })
  await expect(navigation).toBeVisible()
  await expect(navigation.getByRole('link', { name: 'Editor' })).toHaveAttribute('aria-current', 'page')

  await navigation.getByRole('link', { name: 'Report' }).click()
  await expect(page).toHaveURL(/\/laboratory\/report$/)
  await expect(page.getByTestId('laboratory-page-title')).toHaveText('Asset Report')
  await expect(
    page.getByRole('navigation', { name: 'Laboratory pages' }).getByRole('link', { name: 'Report' })
  ).toHaveAttribute('aria-current', 'page')
})

test('renders a not-found page for unknown routes', async ({ page }) => {
  await page.goto('/does-not-exist')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
})
