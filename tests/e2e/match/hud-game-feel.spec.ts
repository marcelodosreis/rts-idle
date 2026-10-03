import { expect, type Page, test } from '@playwright/test'
import { waitForMatchReady } from '../support/settle.js'

async function canvasPoint(page: Page, x: number, y: number) {
  return page.evaluate(
    ([fixedX, fixedY]) => {
      const canvas = document.querySelector('canvas')
      if (canvas === null) {
        throw new Error('no canvas')
      }
      const rect = canvas.getBoundingClientRect()
      const screen = window.__rtsDebug!.worldToScreen(fixedX, fixedY)
      return { x: rect.left + screen.x, y: rect.top + screen.y }
    },
    [x, y] as const
  )
}

async function selectWorker(page: Page): Promise<number> {
  const worker = await page.evaluate(() => {
    const owners = window.__rtsDebug?.getUnitOwners() ?? {}
    return Number(Object.entries(owners).find(([, owner]) => owner === 0)?.[0])
  })
  const position = await page.evaluate((id) => window.__rtsDebug!.getPositions()[String(id)]!, worker)
  const point = await canvasPoint(page, position.x, position.y)
  await page.mouse.click(point.x, point.y)
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getSelection() ?? [])).toContain(worker)
  return worker
}

async function startMatch(page: Page): Promise<number> {
  await page.goto('/?scenario=regression')
  await waitForMatchReady(page)
  return selectWorker(page)
}

test('does not render an empty contextual feedback overlay while idle', async ({ page }) => {
  await page.goto('/?scenario=regression')
  await waitForMatchReady(page)

  await expect(page.getByTestId('hud-context-feedback')).toHaveCount(0)
})

test('armed commands use contextual instruction instead of an order-ready toast', async ({ page }) => {
  await startMatch(page)

  const attack = page.getByRole('button', { name: 'Attack', exact: true })
  await attack.click()

  await expect(attack).toHaveAttribute('data-command-state', 'armed')
  const modeFeedback = page.locator('[data-testid="hud-context-feedback"][data-feedback-source="mode"]')
  await expect(page.getByTestId('hud-context-feedback')).toHaveAttribute('data-feedback-source', 'mode')
  await expect(modeFeedback).toHaveText('Select an enemy target · Esc to cancel')
  await expect(page.getByText('Order ready', { exact: true })).toHaveCount(0)

  await page.keyboard.press('Escape')
  await expect(attack).toHaveAttribute('data-command-state', 'idle')
  await expect(page.getByTestId('hud-context-feedback[data-feedback-source="mode"]')).toHaveCount(0)
})

test('command feedback remains informative with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await startMatch(page)

  const patrol = page.getByRole('button', { name: 'Patrol', exact: true })
  await patrol.click()

  await expect(patrol).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('hud-context-feedback')).toHaveText('Choose a patrol destination · Esc to cancel')
})
