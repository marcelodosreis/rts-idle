import { expect, type Page, test } from '@playwright/test'
import { tilesToFixed } from '@rts/shared'
import { waitForMatchReady, waitForStableCamera } from '../support/settle.js'

const GOLD_MINE_TILE = { x: 24, y: 8.5 }
const CASTLE_DEPOSIT_TILE = { x: 7, y: 9 }
const MONASTERY_TARGET = { x: tilesToFixed(11), y: tilesToFixed(10) }

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

async function focusFixed(page: Page, x: number, y: number) {
  await page.evaluate(([fixedX, fixedY]) => window.__rtsDebug?.moveCamera(fixedX, fixedY), [x, y] as const)
  await waitForStableCamera(page, x, y)
  return canvasPoint(page, x, y)
}

async function workerIds(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const owners = window.__rtsDebug?.getUnitOwners() ?? {}
    const kinds = window.__rtsDebug?.getUnitKinds() ?? {}
    return Object.entries(owners)
      .filter(([id, owner]) => owner === 0 && kinds[id] === 'pawn')
      .map(([id]) => Number(id))
  })
}

async function selectWorker(page: Page, id: number): Promise<void> {
  const position = await page.evaluate((workerId) => window.__rtsDebug!.getPositions()[String(workerId)]!, id)
  const point = await canvasPoint(page, position.x, position.y)
  await page.mouse.click(point.x, point.y)
  await expect.poll(() => page.evaluate(() => window.__rtsDebug!.getSelection()), { timeout: 5_000 }).toContain(id)
}

async function goldValue(page: Page): Promise<number> {
  const text = await page.getByTestId('hud-resource-gold').textContent()
  const value = Number(text?.match(/\d+/)?.[0] ?? 0)
  if (!Number.isFinite(value)) {
    throw new Error('Gold HUD value is missing')
  }
  return value
}

async function constructionAt(page: Page, target: { readonly x: number; readonly y: number }): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(({ x, y }) => {
          const states = Object.values(window.__rtsDebug?.getConstructionStates() ?? {})
          return states.find((construction) => construction.x === x && construction.y === y) ?? null
        }, target),
      { timeout: 20_000 }
    )
    .toMatchObject({ status: 'COMPLETED' })
}

async function selectCastle(page: Page): Promise<void> {
  const origin = await page.evaluate(() => {
    const buildings = Object.values(window.__rtsDebug?.getConstructionStates() ?? {})
    return buildings.sort((left, right) => left.x - right.x)[0]!
  })
  const point = await canvasPoint(page, origin.x + tilesToFixed(2.5), origin.y + tilesToFixed(2))
  await page.mouse.click(point.x, point.y)
  await expect(page.getByTestId('construction-panel')).toContainText('Castle I')
}

async function upgradeCastle(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Upgrade', exact: true }).click()
  await page.getByTestId('upgrade-castle').click()
  await expect(page.getByTestId('construction-panel')).toContainText('Castle II')
  await expect(page.getByText('Ready', { exact: true }).first()).toBeVisible({ timeout: 20_000 })
}

async function buildMonastery(page: Page): Promise<void> {
  const worker = (await workerIds(page))[0]
  if (worker === undefined) {
    throw new Error('regression scenario has no worker for Monastery construction')
  }
  await selectWorker(page, worker)
  await page.getByRole('button', { name: 'Build', exact: true }).click()
  await page.getByTestId('build-monastery').click()
  const targetPoint = await focusFixed(
    page,
    MONASTERY_TARGET.x + tilesToFixed(0.5),
    MONASTERY_TARGET.y + tilesToFixed(0.5)
  )
  await page.mouse.click(targetPoint.x, targetPoint.y)
  await constructionAt(page, MONASTERY_TARGET)
}

async function queueMonkAndResearch(page: Page): Promise<void> {
  const train = page.getByRole('button', { name: 'Train', exact: true })
  await train.click()
  await page.getByTestId('train-monk').click()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await page.getByRole('button', { name: 'Research', exact: true }).click()
  await page.getByTestId('research-economy').click()
  await expect(page.getByTestId('production-item-0')).toHaveAttribute('data-production-status', 'ACTIVE')
  await expect(page.getByTestId('production-item-1')).toHaveAttribute('data-production-status', 'QUEUED')
}

test('completes gather, deposit, Castle II, Monk production, and Economy research', async ({ page }) => {
  test.setTimeout(150_000)
  await page.goto('/?scenario=regression&aggression=passive')
  await waitForMatchReady(page)

  const initialGold = await goldValue(page)
  const worker = (await workerIds(page))[0]
  if (worker === undefined) {
    throw new Error('regression scenario has no worker')
  }
  await selectWorker(page, worker)

  const minePoint = await focusFixed(page, tilesToFixed(GOLD_MINE_TILE.x), tilesToFixed(GOLD_MINE_TILE.y))
  await page.mouse.click(minePoint.x, minePoint.y, { button: 'right' })
  await expect(page.getByTestId('economy-status')).toContainText('Harvesting', { timeout: 30_000 })
  await expect(page.getByTestId('economy-status')).toContainText('Returning', { timeout: 30_000 })
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await expect(page.getByTestId('economy-status')).toContainText('Carrying cargo')

  const castlePoint = await focusFixed(page, tilesToFixed(CASTLE_DEPOSIT_TILE.x), tilesToFixed(CASTLE_DEPOSIT_TILE.y))
  await page.mouse.click(castlePoint.x, castlePoint.y, { button: 'right' })
  await expect.poll(() => goldValue(page), { timeout: 20_000 }).toBeGreaterThan(initialGold)

  await selectCastle(page)
  await upgradeCastle(page)
  await buildMonastery(page)

  const monasteryPoint = await focusFixed(
    page,
    MONASTERY_TARGET.x + tilesToFixed(0.5),
    MONASTERY_TARGET.y + tilesToFixed(0.5)
  )
  await page.mouse.click(monasteryPoint.x, monasteryPoint.y)
  await expect(page.getByTestId('production-panel')).toBeVisible()
  await queueMonkAndResearch(page)

  await expect(page.getByTestId('production-queue-empty')).toContainText('No units or research in queue.', {
    timeout: 90_000
  })
  await expect(page.getByText('Research complete', { exact: true })).toBeVisible()
  await selectWorker(page, worker)
  await page.getByRole('button', { name: new RegExp(`Details for Worker #${worker}`) }).click()
  await expect(page.getByText('Cargo capacity: 12', { exact: true })).toBeVisible()
})
