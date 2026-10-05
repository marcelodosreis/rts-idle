import { expect, test } from '@playwright/test'
import { waitForMatchReady, waitForTicks } from '../support/settle'
import { transportState } from '../support/transport'

test.describe('match session entry', () => {
  test('loads the start screen without opening a gameplay socket', async ({ page }) => {
    const sockets: string[] = []
    page.on('websocket', (socket) => {
      if (socket.url().includes('localhost:8080')) {
        sockets.push(socket.url())
      }
    })

    await page.goto('/')

    await expect(page.getByTestId('home-page')).toBeVisible()
    expect(sockets).toHaveLength(0)
  })

  test('redirects direct match entry without a stored session to the start screen', async ({ page }) => {
    await page.goto('/match')

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByTestId('home-page')).toBeVisible()
  })

  test('redirects direct match entry with a stored session without opening gameplay', async ({ page }) => {
    const sockets: string[] = []
    const serverPort = process.env.E2E_SERVER_PORT ?? '8080'
    page.on('websocket', (socket) => {
      if (socket.url().includes(`localhost:${serverPort}`)) {
        sockets.push(socket.url())
      }
    })

    await page.goto('/?scenario=regression&aggression=passive&sprites=off')
    await waitForMatchReady(page)
    const storedSession = await page.evaluate(() => sessionStorage.getItem('rts-idle.match-session'))
    expect(storedSession).not.toBeNull()
    expect(sockets).toHaveLength(1)

    await page.goto('/match')

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByTestId('home-page')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue match' })).toBeVisible()
    expect(await page.evaluate(() => sessionStorage.getItem('rts-idle.match-session'))).toBe(storedSession)
    expect(sockets).toHaveLength(1)
  })

  test('redirects a refreshed match to the start screen before continuation', async ({ page }) => {
    const sockets: string[] = []
    const serverPort = process.env.E2E_SERVER_PORT ?? '8080'
    page.on('websocket', (socket) => {
      if (socket.url().includes(`localhost:${serverPort}`)) {
        sockets.push(socket.url())
      }
    })

    await page.goto('/?scenario=regression&aggression=passive&sprites=off')
    await waitForMatchReady(page)
    const initial = await transportState(page)
    const initialTick = initial.messages.at(-1)?.tick ?? -1
    expect(sockets).toHaveLength(1)

    await page.reload()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByTestId('home-page')).toBeVisible()
    expect(sockets).toHaveLength(1)
    await page.getByRole('button', { name: 'Continue match' }).click()
    await waitForMatchReady(page)
    await expect.poll(async () => (await transportState(page)).messages.at(-1)?.tick ?? -1).toBeGreaterThan(initialTick)
    expect((await transportState(page)).resumeToken).toBe(initial.resumeToken)
    expect(sockets).toHaveLength(2)
  })

  test('continues the same running session after returning to the start screen', async ({ page }) => {
    await page.goto('/?scenario=regression&aggression=passive&sprites=off')
    await waitForMatchReady(page)
    const initial = await transportState(page)
    const initialTick = initial.messages.at(-1)?.tick ?? -1
    const resumeToken = initial.resumeToken
    expect(resumeToken).not.toBeNull()

    await page.getByRole('button', { name: 'Open DevTools menu' }).click()
    await page.getByRole('link', { name: 'Back to start' }).click()
    await expect(page.getByTestId('home-page')).toBeVisible()
    await page.getByRole('button', { name: 'Continue match' }).click()
    await waitForMatchReady(page)
    await expect.poll(async () => (await transportState(page)).messages.at(-1)?.tick ?? -1).toBeGreaterThan(initialTick)

    expect((await transportState(page)).resumeToken).toBe(resumeToken)
  })

  test('requires confirmation before abandoning a current match', async ({ page }) => {
    await page.goto('/?scenario=regression&aggression=passive')
    await waitForMatchReady(page)
    const currentToken = (await transportState(page)).resumeToken
    expect(currentToken).not.toBeNull()

    await page.getByRole('button', { name: 'Open DevTools menu' }).click()
    await page.getByRole('link', { name: 'Back to start' }).click()
    await page.getByRole('button', { name: 'New match' }).click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await page.getByRole('button', { name: 'Keep current match' }).click()
    await expect(page.getByRole('alertdialog')).toBeHidden()
    await expect(page.getByRole('button', { name: 'Continue match' })).toBeVisible()

    await page.getByRole('button', { name: 'New match' }).click()
    await page.getByRole('button', { name: 'Abandon and start new' }).click()
    await expect(page).toHaveURL(/\/match\?scenario=regression/)
    await waitForMatchReady(page)
    await expect.poll(async () => (await transportState(page)).resumeToken).not.toBe(currentToken)
  })

  test('requires a Home entry after the stored state is cleared', async ({ page }) => {
    await page.goto('/?scenario=regression&aggression=passive')
    await waitForMatchReady(page)
    const storedState = await page.evaluate(() => sessionStorage.getItem('rts-idle.match-session'))
    expect(storedState).not.toBeNull()
    if (storedState === null) {
      throw new Error('Expected a stored match session before clearing it')
    }

    await page.evaluate(() => sessionStorage.clear())
    await page.reload()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByTestId('home-page')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue match' })).toHaveCount(0)
    await page.evaluate((state) => sessionStorage.setItem('rts-idle.match-session', state), storedState)
    await page.reload()
    await page.getByRole('button', { name: 'Continue match' }).click()
    await waitForMatchReady(page)
    await waitForTicks(page, 1)
  })
})
