import { expect, type Page, test } from '@playwright/test'
import { tilesToFixed } from '@rts/shared'
import { hasArt } from './art.js'

/** Economy scenario Mineral Node tile (see apps/server/src/demo/scenarios.ts). */
const ECONOMY_NODE_TILE = { x: 14, y: 7 }

async function canvasPointForFixed(page: Page, x: number, y: number) {
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

/**
 * Centers the camera on a fixed-world point and returns its canvas position.
 * The game canvas is square, so the economy Mine can sit outside the initial
 * view; interactions must pan to the target first.
 */
async function focusFixed(page: Page, x: number, y: number) {
  await page.evaluate(([fixedX, fixedY]) => window.__rtsDebug?.moveCamera(fixedX, fixedY), [x, y] as const)
  return canvasPointForFixed(page, x, y)
}

async function workerIds(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const owners = window.__rtsDebug?.getUnitOwners() ?? {}
    return Object.entries(owners)
      .filter(([, owner]) => owner === 0)
      .map(([id]) => Number(id))
  })
}

async function workerPosition(page: Page, id: number): Promise<{ readonly x: number; readonly y: number }> {
  return page.evaluate((workerId) => {
    const position = window.__rtsDebug?.getPositions()[String(workerId)]
    if (position === undefined) {
      throw new Error('economy Worker is missing')
    }
    return position
  }, id)
}

async function mineralValue(page: Page): Promise<number> {
  return page
    .getByText('Mineral', { exact: true })
    .locator('..')
    .evaluate((chip) => {
      const value = Number(chip.textContent?.match(/\d+/)?.[0])
      if (!Number.isFinite(value)) {
        throw new Error('Mineral HUD value is missing')
      }
      return value
    })
}

test('economy HUD shows authoritative starting supply', async ({ page }) => {
  await page.goto('/?scenario=economy&aggression=passive')
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1)).toBeGreaterThan(0)
  await expect(page.getByTestId('hud-resource-supply')).toContainText('4 / 10')
})

async function boxSelect(page: Page, positions: readonly { readonly x: number; readonly y: number }[]): Promise<void> {
  const points = await Promise.all(positions.map((position) => canvasPointForFixed(page, position.x, position.y)))
  await page.mouse.move(
    Math.min(...points.map((point) => point.x)) - 32,
    Math.min(...points.map((point) => point.y)) - 32
  )
  await page.mouse.down()
  await page.mouse.move(
    Math.max(...points.map((point) => point.x)) + 32,
    Math.max(...points.map((point) => point.y)) + 32,
    {
      steps: 4
    }
  )
  await page.mouse.up()
}

test('a player gathers, deposits, repeats, and stops through browser controls', async ({ page }) => {
  test.setTimeout(35_000)
  await page.goto('/?scenario=economy')
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1)).toBeGreaterThan(0)

  const initialMinerals = await mineralValue(page)
  expect(initialMinerals).toBe(250)

  const workers = await workerIds(page)
  expect(workers).toHaveLength(4)
  const id = workers[0]!
  const start = await workerPosition(page, id)
  const workerPoint = await canvasPointForFixed(page, start.x, start.y)
  await page.mouse.click(workerPoint.x, workerPoint.y)
  await expect(page.getByText('1 · Worker')).toBeVisible()

  const nodePoint = await focusFixed(page, tilesToFixed(ECONOMY_NODE_TILE.x), tilesToFixed(ECONOMY_NODE_TILE.y))
  await page.mouse.click(nodePoint.x, nodePoint.y, { button: 'right' })

  await expect.poll(async () => (await workerPosition(page, id)).x).toBe(tilesToFixed(ECONOMY_NODE_TILE.x))
  await expect(page.getByTestId('economy-status')).toContainText('Mining')
  // Economy anims (gather/carry_run) only render when the tiny_swords art pack
  // is present (`pnpm run assets:prepare`); CI and a bare checkout run without
  // it, so skip the anim check then (see art.ts / regression-units-visible.spec.ts).
  const art = await hasArt(page)
  if (art) {
    await expect
      .poll(() => page.evaluate((unitId) => window.__rtsDebug?.getSpriteState(unitId)?.anim, id))
      .toBe('gather')
  }
  await expect(page.getByTestId('economy-status')).toContainText('Returning', { timeout: 15_000 })
  if (art) {
    await expect
      .poll(() => page.evaluate((unitId) => window.__rtsDebug?.getSpriteState(unitId)?.anim, id))
      .toBe('carry_run')
  }
  await expect.poll(() => mineralValue(page), { timeout: 20_000 }).toBeGreaterThan(initialMinerals)

  await page.getByRole('button', { name: 'Stop' }).click()
  const stopped = await workerPosition(page, id)
  const stoppedMinerals = await mineralValue(page)
  await page.waitForTimeout(700)
  expect(await workerPosition(page, id)).toEqual(stopped)
  expect(await mineralValue(page)).toBe(stoppedMinerals)
  await expect(page.getByTestId('economy-status')).toBeEmpty()
  if (art) {
    await expect.poll(() => page.evaluate((unitId) => window.__rtsDebug?.getSpriteState(unitId)?.anim, id)).toBe('idle')
  }
})

test('an interrupted carrying worker shows cargo and deposits by right-clicking the Base', async ({ page }) => {
  test.setTimeout(35_000)
  await page.goto('/?scenario=economy')
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1)).toBeGreaterThan(0)

  const initialMinerals = await mineralValue(page)
  const workers = await workerIds(page)
  const id = workers[0]!
  const start = await workerPosition(page, id)
  const workerPoint = await canvasPointForFixed(page, start.x, start.y)
  await page.mouse.click(workerPoint.x, workerPoint.y)
  await expect(page.getByText('1 · Worker')).toBeVisible()

  const nodePoint = await focusFixed(page, tilesToFixed(ECONOMY_NODE_TILE.x), tilesToFixed(ECONOMY_NODE_TILE.y))
  await page.mouse.click(nodePoint.x, nodePoint.y, { button: 'right' })
  await expect(page.getByTestId('economy-status')).toContainText('Returning', { timeout: 15_000 })

  // Interrupt the automatic return; the worker keeps its cargo but loses the
  // gather order, so the carrying state must remain visible on its own.
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByTestId('economy-status')).toContainText('Carrying cargo')
  const art = await hasArt(page)
  if (art) {
    await expect
      .poll(() => page.evaluate((unitId) => window.__rtsDebug?.getSpriteState(unitId)?.anim, id))
      .toBe('carry_idle')
  }

  const basePoint = await focusFixed(page, tilesToFixed(7), tilesToFixed(9))
  await page.mouse.click(basePoint.x, basePoint.y, { button: 'right' })
  await expect.poll(() => mineralValue(page), { timeout: 15_000 }).toBeGreaterThan(initialMinerals)
  await expect(page.getByTestId('economy-status')).toBeEmpty()
  if (art) {
    await expect.poll(() => page.evaluate((unitId) => window.__rtsDebug?.getSpriteState(unitId)?.anim, id)).toBe('idle')
  }
})

test('a primary click selects a mineral node without selecting a worker', async ({ page }) => {
  await page.goto('/?scenario=economy&aggression=passive')
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1)).toBeGreaterThan(0)

  const nodePoint = await focusFixed(page, tilesToFixed(ECONOMY_NODE_TILE.x), tilesToFixed(ECONOMY_NODE_TILE.y))
  await page.mouse.click(nodePoint.x, nodePoint.y)

  await expect(page.getByTestId('mineral-panel')).toContainText('Mineral Node')
  await expect(page.getByTestId('mineral-panel')).toContainText('Neutral resource')
  await expect(page.getByTestId('mineral-remaining')).toHaveText('3000 remaining')
  await expect(page.getByTestId('economy-status')).toHaveCount(0)
  await expect(page.getByTestId('mineral-panel')).toBeVisible()
})

test('a group mines the same node concurrently through the browser command path', async ({ page }) => {
  test.setTimeout(35_000)
  await page.goto('/?scenario=economy')
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1)).toBeGreaterThan(0)

  const workers = await workerIds(page)
  const group = workers.slice(0, 2)
  const starts = await Promise.all(group.map((id) => workerPosition(page, id)))
  await boxSelect(page, starts)
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getSelection() ?? [])).toEqual(group)

  const nodePoint = await focusFixed(page, tilesToFixed(ECONOMY_NODE_TILE.x), tilesToFixed(ECONOMY_NODE_TILE.y))
  await page.mouse.click(nodePoint.x, nodePoint.y, { button: 'right' })
  await expect
    .poll(async () => Promise.all(group.map((id) => workerPosition(page, id))))
    .toEqual([
      { x: tilesToFixed(ECONOMY_NODE_TILE.x), y: tilesToFixed(ECONOMY_NODE_TILE.y) },
      { x: tilesToFixed(ECONOMY_NODE_TILE.x), y: tilesToFixed(ECONOMY_NODE_TILE.y) }
    ])

  const economyLabels = () =>
    group.map((id) => page.getByRole('button', { name: new RegExp(`Worker #${id}, owner 0, Mining \\d+/20`) }))
  await expect.poll(async () => Promise.all((await economyLabels()).map((label) => label.count()))).toEqual([1, 1])
  const progress = await Promise.all(
    group.map(async (id) => {
      const label = await page.getByRole('button', { name: new RegExp(`Worker #${id}`) }).getAttribute('aria-label')
      return Number(label?.match(/Mining (\d+)\/20/)?.[1])
    })
  )
  expect(progress[0]).toBeGreaterThan(0)
  expect(progress[1]).toBeGreaterThan(0)
  await expect(page.getByTestId('economy-status')).toContainText('Mining')

  if (await hasArt(page)) {
    for (const id of group) {
      await expect
        .poll(() => page.evaluate((unitId) => window.__rtsDebug?.getSpriteState(unitId)?.anim, id))
        .toBe('gather')
    }
  }
})
