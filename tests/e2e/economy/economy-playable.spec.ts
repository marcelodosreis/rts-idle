import { expect, type Page, test } from '@playwright/test'
import { tilesToFixed } from '@rts/shared'
import { hasArt } from '../support/art.js'

/** Economy scenario Gold Mine tile (see packages/game-data/src/maps/competitive.ts). */
const ECONOMY_NODE_TILE = { x: 24, y: 8.5 }
const TREE_TILE = { x: 5, y: 23 }
const NODE_ARRIVAL_TIMEOUT = 15_000

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
 * The game canvas is square, so the economy Gold Mine can sit outside the
 * initial view; interactions must pan to the target first.
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

async function goldValue(page: Page): Promise<number> {
  const text = await page.getByTestId('hud-resource-gold').textContent()
  const value = Number(text?.match(/\d+/)?.[0])
  if (!Number.isFinite(value)) {
    throw new Error('Gold HUD value is missing')
  }
  return value
}

async function woodValue(page: Page): Promise<number> {
  const text = await page.getByTestId('hud-resource-wood').textContent()
  const value = Number(text?.match(/\d+/)?.[0])
  if (!Number.isFinite(value)) {
    throw new Error('Wood HUD value is missing')
  }
  return value
}

async function resourcePixels(page: Page): Promise<readonly string[]> {
  const screenshot = await page.screenshot()
  return page.evaluate(
    async ({ encoded, fixedX, fixedY }) => {
      const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0))
      const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')
      if (context === null) {
        return []
      }
      context.drawImage(image, 0, 0)
      const gameCanvas = document.querySelector('canvas')
      if (gameCanvas === null) {
        return []
      }
      const rect = gameCanvas.getBoundingClientRect()
      const point = window.__rtsDebug!.worldToScreen(fixedX, fixedY)
      const x = Math.round(rect.left + point.x)
      const y = Math.round(rect.top + point.y)
      const pixels = context.getImageData(x - 24, y - 48, 48, 48).data
      const colors = new Set<string>()
      for (let index = 0; index < pixels.length; index += 4) {
        colors.add(`${pixels[index]},${pixels[index + 1]},${pixels[index + 2]},${pixels[index + 3]}`)
      }
      return [...colors]
    },
    { encoded: screenshot.toString('base64'), fixedX: tilesToFixed(TREE_TILE.x), fixedY: tilesToFixed(TREE_TILE.y) }
  )
}

test('economy HUD shows authoritative starting supply', async ({ page }) => {
  await page.goto('/?scenario=regression&aggression=passive&sprites=off')
  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1), { timeout: 15_000 })
    .toBeGreaterThan(0)
  await expect(page.getByTestId('hud-resource-supply')).toContainText('4 / 10')
})

test('a worker selects, cuts, carries, and deposits wood from a tree', async ({ page }) => {
  test.setTimeout(100_000)
  await page.goto('/?scenario=regression')
  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1), { timeout: 15_000 })
    .toBeGreaterThan(0)

  const treePoint = await focusFixed(page, tilesToFixed(TREE_TILE.x), tilesToFixed(TREE_TILE.y))
  await expect.poll(() => page.evaluate(() => Object.keys(window.__rtsDebug?.getResources() ?? {}).length)).toBe(41)
  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getResourceRenderStats().activeVisuals ?? 0))
    .toBeGreaterThan(0)
  await expect.poll(() => resourcePixels(page)).not.toHaveLength(1)
  await page.mouse.click(treePoint.x, treePoint.y)
  await expect(page.getByText('Tree', { exact: true })).toBeVisible()
  await expect(page.getByTestId('neutral-resource-icon')).toHaveClass(/text-lime-300/)
  await expect(page.getByText('Neutral resource · Tree #1')).toBeVisible()

  const worker = (await workerIds(page))[0]!
  const start = await workerPosition(page, worker)
  await focusFixed(page, start.x, start.y)
  const workerPoint = await canvasPointForFixed(page, start.x, start.y)
  await page.mouse.click(workerPoint.x, workerPoint.y)
  await expect(page.getByRole('heading', { name: `Worker #${worker}` })).toBeVisible()
  const initialWood = await woodValue(page)
  const commandTreePoint = await focusFixed(page, tilesToFixed(TREE_TILE.x), tilesToFixed(TREE_TILE.y))
  await page.mouse.click(commandTreePoint.x, commandTreePoint.y, { button: 'right' })
  await expect(page.getByTestId('economy-status')).toHaveText('Going to resource')

  await expect
    .poll(async () => (await workerPosition(page, worker)).x, { timeout: NODE_ARRIVAL_TIMEOUT })
    .toBe(tilesToFixed(TREE_TILE.x))
  await expect.poll(() => woodValue(page), { timeout: 60_000 }).toBeGreaterThan(initialWood)
})

test('a depleted tree remains visible as a stump and stops accepting gather', async ({ page }) => {
  test.setTimeout(300_000)
  await page.goto('/?scenario=regression&aggression=passive&sprites=off')
  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1), { timeout: 15_000 })
    .toBeGreaterThan(0)

  const treePoint = await focusFixed(page, tilesToFixed(TREE_TILE.x), tilesToFixed(TREE_TILE.y))
  const worker = (await workerIds(page))[0]!
  const start = await workerPosition(page, worker)
  await focusFixed(page, start.x, start.y)
  const workerPoint = await canvasPointForFixed(page, start.x, start.y)
  await page.mouse.click(workerPoint.x, workerPoint.y)
  const commandTreePoint = await focusFixed(page, tilesToFixed(TREE_TILE.x), tilesToFixed(TREE_TILE.y))
  await page.mouse.click(commandTreePoint.x, commandTreePoint.y, { button: 'right' })

  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getResources()['1']?.remaining ?? -1), {
      timeout: 240_000
    })
    .toBe(0)
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getResourceRenderStats().stumps ?? 0)).toBe(1)
  await expect.poll(() => resourcePixels(page)).not.toHaveLength(1)
  await page.mouse.click(treePoint.x, treePoint.y)
  await expect(page.getByText('Tree', { exact: true })).toBeVisible()
  await expect(page.getByTestId('neutral-resource-icon')).toHaveClass(/text-lime-300/)
  await expect(page.getByTestId('resource-remaining')).toHaveText('0 remaining')
  await page.mouse.click(treePoint.x, treePoint.y, { button: 'right' })
  await expect(page.getByText('Tree', { exact: true })).toBeVisible()
  await expect(page.getByTestId('resource-remaining')).toHaveText('0 remaining')

  const workerAfterDepletion = await workerPosition(page, worker)
  await focusFixed(page, workerAfterDepletion.x, workerAfterDepletion.y)
  const depletedWorkerPoint = await canvasPointForFixed(page, workerAfterDepletion.x, workerAfterDepletion.y)
  await page.mouse.click(depletedWorkerPoint.x, depletedWorkerPoint.y)
  await page.evaluate((id) => window.__rtsDebug?.setSelection([id]), worker)
  await expect(page.getByRole('heading', { name: `Worker #${worker}` })).toBeVisible()
  await page.getByRole('button', { name: 'Build', exact: true }).click()
  await page.getByTestId('build-house').click()
  const stumpTile = { x: tilesToFixed(TREE_TILE.x), y: tilesToFixed(TREE_TILE.y) }
  const stumpBuildPoint = await focusFixed(page, stumpTile.x + 128, stumpTile.y + 128)
  await page.mouse.click(stumpBuildPoint.x, stumpBuildPoint.y)
  await expect
    .poll(() =>
      page.evaluate((target) => {
        return Object.values(window.__rtsDebug?.getConstructionStates() ?? {}).some(
          (construction) => construction.x === target.x && construction.y === target.y
        )
      }, stumpTile)
    )
    .toBe(false)
})

test('a pawn remains selectable while standing on the gold mine', async ({ page }) => {
  await page.goto('/?scenario=regression')
  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1), { timeout: 15_000 })
    .toBeGreaterThan(0)

  const id = (await workerIds(page))[0]!
  const start = await workerPosition(page, id)
  const workerPoint = await canvasPointForFixed(page, start.x, start.y)
  await page.mouse.click(workerPoint.x, workerPoint.y)
  await expect(page.getByRole('heading', { name: `Worker #${id}` })).toBeVisible()

  const nodePoint = await focusFixed(page, tilesToFixed(ECONOMY_NODE_TILE.x), tilesToFixed(ECONOMY_NODE_TILE.y))
  await page.mouse.click(nodePoint.x, nodePoint.y, { button: 'right' })
  await expect
    .poll(async () => (await workerPosition(page, id)).x, { timeout: NODE_ARRIVAL_TIMEOUT })
    .toBe(tilesToFixed(ECONOMY_NODE_TILE.x))

  await page.mouse.click(nodePoint.x, nodePoint.y)
  await expect(page.getByRole('heading', { name: `Worker #${id}` })).toBeVisible()
  await expect(page.getByTestId('resource-panel')).toHaveCount(0)
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
  await page.goto('/?scenario=regression')
  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1), { timeout: 15_000 })
    .toBeGreaterThan(0)

  const initialGold = await goldValue(page)
  expect(initialGold).toBe(250)

  const workers = await workerIds(page)
  expect(workers).toHaveLength(4)
  const id = workers[0]!
  const start = await workerPosition(page, id)
  const workerPoint = await canvasPointForFixed(page, start.x, start.y)
  await page.mouse.click(workerPoint.x, workerPoint.y)
  await expect(page.getByRole('heading', { name: `Worker #${id}` })).toBeVisible()

  const nodePoint = await focusFixed(page, tilesToFixed(ECONOMY_NODE_TILE.x), tilesToFixed(ECONOMY_NODE_TILE.y))
  await page.mouse.click(nodePoint.x, nodePoint.y, { button: 'right' })

  await expect
    .poll(async () => (await workerPosition(page, id)).x, { timeout: NODE_ARRIVAL_TIMEOUT })
    .toBe(tilesToFixed(ECONOMY_NODE_TILE.x))
  await expect(page.getByTestId('economy-status')).toContainText('Harvesting')
  await expect(page.getByTestId('economy-status')).toHaveCSS('color', 'rgb(250, 204, 21)')
  // Economy anims (gather/carry_run) only render when the tiny_swords art pack
  // is present (`pnpm run assets:prepare`); CI and a bare checkout run without
  // it, so skip the anim check then (see art.ts / regression-units-visible.spec.ts).
  const art = await hasArt(page)
  if (art) {
    await expect
      .poll(() => page.evaluate((unitId) => window.__rtsDebug?.getSpriteState(unitId)?.anim, id))
      .toBe('gather')
  }
  await expect(page.getByTestId('economy-status')).toContainText('Returning', { timeout: 30_000 })
  if (art) {
    await expect
      .poll(() => page.evaluate((unitId) => window.__rtsDebug?.getSpriteState(unitId)?.anim, id))
      .toBe('carry_run')
  }
  await expect.poll(() => goldValue(page), { timeout: 20_000 }).toBeGreaterThan(initialGold)

  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByTestId('economy-status')).toBeEmpty()
  const stopped = await workerPosition(page, id)
  const stoppedGold = await goldValue(page)
  await page.waitForTimeout(700)
  expect(await workerPosition(page, id)).toEqual(stopped)
  expect(await goldValue(page)).toBe(stoppedGold)
  if (art) {
    await expect.poll(() => page.evaluate((unitId) => window.__rtsDebug?.getSpriteState(unitId)?.anim, id)).toBe('idle')
  }
})

test('an interrupted carrying worker shows cargo and deposits by right-clicking the Base', async ({ page }) => {
  test.setTimeout(35_000)
  await page.goto('/?scenario=regression')
  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1), { timeout: 15_000 })
    .toBeGreaterThan(0)

  const initialGold = await goldValue(page)
  const workers = await workerIds(page)
  const id = workers[0]!
  const start = await workerPosition(page, id)
  const workerPoint = await canvasPointForFixed(page, start.x, start.y)
  await page.mouse.click(workerPoint.x, workerPoint.y)
  await expect(page.getByRole('heading', { name: `Worker #${id}` })).toBeVisible()

  const nodePoint = await focusFixed(page, tilesToFixed(ECONOMY_NODE_TILE.x), tilesToFixed(ECONOMY_NODE_TILE.y))
  await page.mouse.click(nodePoint.x, nodePoint.y, { button: 'right' })
  await expect(page.getByTestId('economy-status')).toContainText('Returning', { timeout: 30_000 })

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
  await expect.poll(() => goldValue(page), { timeout: 15_000 }).toBeGreaterThan(initialGold)
  await expect(page.getByTestId('economy-status')).toBeEmpty()
  if (art) {
    await expect.poll(() => page.evaluate((unitId) => window.__rtsDebug?.getSpriteState(unitId)?.anim, id)).toBe('idle')
  }
})

test('a primary click selects the gold mine without selecting a worker', async ({ page }) => {
  await page.goto('/?scenario=regression')
  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1), { timeout: 15_000 })
    .toBeGreaterThan(0)

  const nodePoint = await focusFixed(page, tilesToFixed(ECONOMY_NODE_TILE.x), tilesToFixed(ECONOMY_NODE_TILE.y))
  await page.mouse.click(nodePoint.x, nodePoint.y)

  await expect(page.getByTestId('resource-panel')).toContainText('Gold Mine')
  await expect(page.getByTestId('resource-panel')).toContainText('Neutral resource')
  await expect(page.getByTestId('resource-remaining')).toHaveText('3000 remaining')
  await expect(page.getByTestId('neutral-resource-icon')).toHaveClass(/text-amber-300/)
  await expect(page.getByTestId('economy-status')).toHaveCount(0)
  await expect(page.getByTestId('resource-panel')).toBeVisible()
  await expect(page.locator('[data-command-id]')).toHaveCount(0)
  await expect(page.locator('[data-testid^="command-slot-"]')).toHaveCount(9)
})

test('a group harvests the same gold mine concurrently through the browser command path', async ({ page }) => {
  test.setTimeout(35_000)
  await page.goto('/?scenario=regression')
  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1), { timeout: 15_000 })
    .toBeGreaterThan(0)

  const workers = await workerIds(page)
  const group = workers.slice(0, 2)
  const starts = await Promise.all(group.map((id) => workerPosition(page, id)))
  await boxSelect(page, starts)
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getSelection() ?? [])).toEqual(group)

  const nodePoint = await focusFixed(page, tilesToFixed(ECONOMY_NODE_TILE.x), tilesToFixed(ECONOMY_NODE_TILE.y))
  await page.mouse.click(nodePoint.x, nodePoint.y, { button: 'right' })
  await expect
    .poll(async () => Promise.all(group.map((id) => workerPosition(page, id))), { timeout: NODE_ARRIVAL_TIMEOUT })
    .toEqual([
      { x: tilesToFixed(ECONOMY_NODE_TILE.x), y: tilesToFixed(ECONOMY_NODE_TILE.y) },
      { x: tilesToFixed(ECONOMY_NODE_TILE.x), y: tilesToFixed(ECONOMY_NODE_TILE.y) }
    ])

  const economyLabels = () =>
    group.map((id) => page.getByRole('button', { name: new RegExp(`Worker #${id}.*Harvesting \\d+/200`) }))
  await expect.poll(async () => Promise.all((await economyLabels()).map((label) => label.count()))).toEqual([1, 1])
  await expect
    .poll(
      async () => {
        const progress = await Promise.all(
          group.map(async (id) => {
            const label = await page
              .getByRole('button', { name: new RegExp(`Worker #${id}`) })
              .getAttribute('aria-label')
            return Number(label?.match(/Harvesting (\d+)\/200/)?.[1] ?? 0)
          })
        )
        return progress.every((value) => value > 0)
      },
      { timeout: 15_000 }
    )
    .toBe(true)
  await expect(page.getByRole('button', { name: /Harvesting/ }).first()).toBeVisible()

  if (await hasArt(page)) {
    for (const id of group) {
      await expect
        .poll(() => page.evaluate((unitId) => window.__rtsDebug?.getSpriteState(unitId)?.anim, id))
        .toBe('gather')
    }
  }
})
