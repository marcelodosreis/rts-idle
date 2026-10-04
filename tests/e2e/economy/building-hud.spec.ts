import { expect, test } from '@playwright/test'
import { FIXED_SCALE, tilesToFixed } from '@rts/shared'
import { expectAnim, hasArt } from '../support/art.js'
import { waitForMatchReady } from '../support/settle.js'

async function canvasPointForFixed(page: import('@playwright/test').Page, x: number, y: number) {
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

async function workerIds(page: import('@playwright/test').Page): Promise<number[]> {
  return page.evaluate(() => {
    const owners = window.__rtsDebug?.getUnitOwners() ?? {}
    const kinds = window.__rtsDebug?.getUnitKinds() ?? {}
    return Object.entries(owners)
      .filter(([id, owner]) => owner === 0 && kinds[id] === 'pawn')
      .map(([id]) => Number(id))
  })
}

async function selectWorker(page: import('@playwright/test').Page, id: number): Promise<void> {
  await expect
    .poll(() => page.evaluate((workerId) => window.__rtsDebug!.getPositions()[String(workerId)] ?? null, id))
    .not.toBeNull()
  const position = await page.evaluate((workerId) => window.__rtsDebug!.getPositions()[String(workerId)] ?? null, id)
  if (position === null) {
    throw new Error(`worker ${id} position is missing`)
  }
  const point = await canvasPointForFixed(page, position.x, position.y)
  await page.mouse.click(point.x, point.y)
}

async function startMatch(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/?scenario=regression')
  await waitForMatchReady(page)
}

async function constructionAt(
  page: import('@playwright/test').Page,
  target: { readonly x: number; readonly y: number }
) {
  return page.evaluate(({ x, y }) => {
    const entry = Object.entries(window.__rtsDebug?.getConstructionStates() ?? {}).find(
      ([, construction]) => construction.x === x && construction.y === y
    )
    return entry === undefined ? null : (window.__rtsDebug?.getConstructionDiagnostic(Number(entry[0])) ?? null)
  }, target)
}

async function goldValue(page: import('@playwright/test').Page): Promise<number> {
  const text = await page.getByTestId('hud-resource-gold').textContent()
  const value = Number(text?.match(/\d+/)?.[0])
  if (!Number.isFinite(value)) {
    throw new Error('Gold HUD value is missing')
  }
  return value
}

async function armBuild(page: import('@playwright/test').Page, buildingType: string): Promise<void> {
  const build = page.getByRole('button', { name: 'Build', exact: true })
  if (await build.isVisible()) {
    await build.click()
  }
  await page.getByTestId(`build-${buildingType.toLowerCase()}`).click()
}

test('construction HUD uses the concise building labels and preserves costs', async ({ page }) => {
  await startMatch(page)

  const workerId = (await workerIds(page))[0]!
  expect(workerId).toBeGreaterThan(0)
  await expect
    .poll(() => page.evaluate((id) => window.__rtsDebug!.getPositions()[String(id)]!, workerId))
    .toEqual({ x: tilesToFixed(8), y: tilesToFixed(11) })
  await selectWorker(page, workerId)

  await page.getByRole('button', { name: 'Build', exact: true }).click()
  await expect(page.getByTestId('build-castle')).toHaveAttribute('aria-disabled', 'false')
  await expect(page.getByTestId('build-barracks')).toHaveAttribute('aria-disabled', 'false')
  await expect(page.getByTestId('build-house')).toHaveAttribute('aria-disabled', 'false')
  await expect(page.getByTestId('build-archery')).toHaveCount(1)
  await expect(page.getByTestId('build-monastery')).toHaveCount(1)
  await expect(page.getByTestId('build-tower')).toHaveCount(1)
  await expect(page.locator('[data-testid^="command-slot-"]')).toHaveCount(9)
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeVisible()
})

test('locks every building command while a Castle upgrade is running', async ({ page }) => {
  test.setTimeout(30_000)
  await startMatch(page)
  const origin = await page.evaluate(() => {
    const buildings = Object.values(window.__rtsDebug?.getConstructionStates() ?? {})
    return buildings.sort((left, right) => left.x - right.x)[0]!
  })
  const point = await canvasPointForFixed(page, origin.x + tilesToFixed(2.5), origin.y + tilesToFixed(2))
  await page.mouse.click(point.x, point.y)
  await expect(page.getByTestId('construction-panel')).toContainText('Castle')

  await page.getByRole('button', { name: 'Upgrade', exact: true }).click()
  await page.getByTestId('upgrade-castle').click()

  for (const command of ['train', 'rally', 'upgrade']) {
    await expect(page.getByTestId(command)).toHaveAttribute('aria-disabled', 'true')
  }
  await page.getByTestId('upgrade').hover()
  await expect(page.getByText('Castle upgrade in progress.', { exact: true })).toBeVisible()
  await expect(page.getByTestId('production-panel')).toHaveCount(0)
  await expect(page.getByTestId('command-card')).toContainText('COMMANDS')
  await expect(page.getByTestId('command-card')).not.toContainText('UPGRADE')
  await expect(page.getByTestId('cancel-construction')).toHaveCount(0)
})

test('House capacity activates only after construction completes', async ({ page }) => {
  test.setTimeout(30_000)
  await startMatch(page)
  const workerId = (await workerIds(page))[0]!
  await selectWorker(page, workerId)
  await expect(page.getByTestId('hud-resource-supply')).toContainText('8 / 18')
  await armBuild(page, 'HOUSE')
  await expect(page.getByTestId('build')).toHaveAttribute('aria-pressed', 'true')

  const target = { x: tilesToFixed(10), y: tilesToFixed(10) }
  const point = await canvasPointForFixed(page, target.x + FIXED_SCALE / 2, target.y + FIXED_SCALE / 2)
  await page.mouse.click(point.x, point.y)
  await expect.poll(() => constructionAt(page, target)).toMatchObject({ status: 'FOUNDATION' })
  await expect(page.getByTestId('hud-resource-supply')).toContainText('8 / 18')
  await expect.poll(() => constructionAt(page, target), { timeout: 20_000 }).toMatchObject({ status: 'COMPLETED' })
  await expect(page.getByTestId('hud-resource-supply')).toContainText('8 / 26')
  const completionToast = page.getByRole('status').filter({ hasText: 'Construction complete' })
  await expect(completionToast).toContainText('House')
  await expect(completionToast).toHaveClass(/border-zinc-600/)
  await expect(completionToast).not.toHaveClass(/border-emerald/)
  // The toast slides down from off-screen, so poll until the entrance animation
  // settles before asserting the final position.
  await expect
    .poll(async () => {
      const toastPosition = await page.evaluate(() => {
        const toast = document.querySelector('[role="status"]')
        const topbar = document.querySelector('[data-testid="hud-topbar"]')
        if (toast === null || topbar === null) {
          return null
        }
        const toastBox = toast.getBoundingClientRect()
        return {
          toastTop: toastBox.top,
          toastRight: toastBox.right,
          topbarBottom: topbar.getBoundingClientRect().bottom,
          viewportWidth: window.innerWidth
        }
      })
      if (toastPosition === null) {
        return false
      }
      return (
        toastPosition.toastTop >= toastPosition.topbarBottom &&
        Math.abs(toastPosition.viewportWidth - toastPosition.toastRight - 12) <= 1
      )
    })
    .toBe(true)
})

test('construction stays at the clicked location while the worker travels', async ({ page }) => {
  test.setTimeout(30_000)
  await startMatch(page)

  const workerId = (await workerIds(page))[0]!
  expect(workerId).toBeGreaterThan(0)
  await selectWorker(page, workerId)
  await armBuild(page, 'CASTLE')

  const target = { x: tilesToFixed(10), y: tilesToFixed(10) }
  const clickTarget = { x: target.x + FIXED_SCALE / 2, y: target.y + FIXED_SCALE / 2 }
  const point = await page.evaluate((fixed) => {
    const canvas = document.querySelector('canvas')
    if (canvas === null) {
      throw new Error('no canvas')
    }
    const rect = canvas.getBoundingClientRect()
    const screen = window.__rtsDebug!.worldToScreen(fixed.x, fixed.y)
    return { x: rect.left + screen.x, y: rect.top + screen.y }
  }, clickTarget)
  await page.mouse.click(point.x, point.y)

  await expect
    .poll(() => constructionAt(page, target))
    .toMatchObject({ x: target.x, y: target.y, status: expect.stringMatching(/FOUNDATION|UNDER_CONSTRUCTION/) })
  if (await hasArt(page)) {
    await expect.poll(() => expectAnim(page, workerId, ['build'])).not.toBeNull()
  }
  await expect
    .poll(() => constructionAt(page, target), { timeout: 20_000 })
    .toMatchObject({
      x: target.x,
      y: target.y,
      status: 'COMPLETED'
    })
  await expect
    .poll(() => page.evaluate((id) => window.__rtsDebug!.getPositions()[String(id)]!, workerId), { timeout: 5_000 })
    .toEqual({ x: tilesToFixed(10), y: tilesToFixed(12) })

  await page.mouse.click(point.x, point.y)
  await expect(page.getByTestId('construction-panel')).toContainText('Castle I')
  await expect(page.getByTestId('construction-panel').getByText('Ready', { exact: true }).first()).toBeVisible({
    timeout: 15_000
  })
  await expect(page.getByTestId('construction-panel')).not.toContainText('100/100')
  await expect(page.getByTestId('construction-panel')).not.toContainText('No worker assigned')
})

test('construction preview explains an occupied location before sending a command', async ({ page }) => {
  test.setTimeout(30_000)
  await startMatch(page)
  const workers = await workerIds(page)
  await selectWorker(page, workers[0]!)
  await armBuild(page, 'CASTLE')

  const target = { x: tilesToFixed(10), y: tilesToFixed(10) }
  const targetPoint = await canvasPointForFixed(page, target.x + FIXED_SCALE / 2, target.y + FIXED_SCALE / 2)
  await page.mouse.click(targetPoint.x, targetPoint.y)
  await expect.poll(() => constructionAt(page, target), { timeout: 15_000 }).toMatchObject({ status: 'COMPLETED' })

  await selectWorker(page, workers[1]!)
  await armBuild(page, 'BARRACKS')
  await page.mouse.move(targetPoint.x, targetPoint.y)
  await expect(page.getByText('Location is occupied.', { exact: true })).toBeVisible()
})

test('a construction can pause and resume with another worker through the HUD', async ({ page }) => {
  test.setTimeout(35_000)
  await startMatch(page)

  const workers = await workerIds(page)
  const builder = workers[0]!
  const replacement = workers[1]!
  await selectWorker(page, builder)
  await armBuild(page, 'CASTLE')

  const target = { x: tilesToFixed(10), y: tilesToFixed(10) }
  const targetPoint = await canvasPointForFixed(page, target.x + FIXED_SCALE / 2, target.y + FIXED_SCALE / 2)
  const constructionPoint = await canvasPointForFixed(page, target.x + FIXED_SCALE, target.y + FIXED_SCALE / 2)
  await page.mouse.click(targetPoint.x, targetPoint.y)

  await expect.poll(() => constructionAt(page, target), { timeout: 15_000 }).toMatchObject({ status: 'FOUNDATION' })

  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await page.mouse.click(targetPoint.x, targetPoint.y)
  await expect(page.getByTestId('construction-panel')).toContainText('Paused')
  await expect(page.getByTestId('construction-panel')).toContainText('No worker assigned')
  await expect(page.getByTestId('construction-progress-bar')).toBeVisible()
  const pausedProgress = await page.getByTestId('construction-status').textContent()

  await selectWorker(page, replacement)
  await page.mouse.click(constructionPoint.x, constructionPoint.y, { button: 'right' })
  if (!(await page.getByTestId('current-context-card').textContent())?.includes('Building')) {
    await page.mouse.click(targetPoint.x, targetPoint.y, { button: 'right' })
  }
  await expect(page.getByTestId('current-context-card')).toContainText('Building')
  await page.mouse.click(constructionPoint.x, constructionPoint.y)
  if ((await page.getByTestId('construction-panel').count()) === 0) {
    await page.mouse.click(targetPoint.x, targetPoint.y)
  }
  await expect(page.getByTestId('construction-panel')).toContainText(`Worker #${replacement}`)
  await expect(page.getByTestId('construction-panel')).not.toContainText('Paused')

  await expect.poll(() => page.getByTestId('construction-status').textContent()).not.toBe(pausedProgress)
  await expect(page.getByTestId('construction-panel')).toContainText('Castle I', { timeout: 15_000 })
  await expect(page.getByTestId('construction-panel').getByText('Ready', { exact: true }).first()).toBeVisible({
    timeout: 15_000
  })
  await expect(page.getByTestId('cancel-construction')).toHaveCount(0)
})

test('an in-progress construction can be cancelled through the HUD with a partial refund', async ({ page }) => {
  test.setTimeout(30_000)
  await startMatch(page)

  const workerId = (await workerIds(page))[0]!
  await selectWorker(page, workerId)
  await armBuild(page, 'CASTLE')

  const target = { x: tilesToFixed(10), y: tilesToFixed(10) }
  const targetPoint = await canvasPointForFixed(page, target.x + FIXED_SCALE / 2, target.y + FIXED_SCALE / 2)
  await page.mouse.click(targetPoint.x, targetPoint.y)
  await expect.poll(() => constructionAt(page, target), { timeout: 15_000 }).toMatchObject({ status: 'FOUNDATION' })

  const goldBefore = await goldValue(page)
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await page.mouse.click(targetPoint.x, targetPoint.y)
  const cancel = page.getByTestId('cancel-construction')
  await expect(cancel).toBeVisible()
  await cancel.click()
  await expect(cancel).toContainText('Confirm')
  await cancel.click()

  await expect.poll(() => constructionAt(page, target)).toBeNull()
  await expect.poll(() => goldValue(page)).toBeGreaterThan(goldBefore)
  await expect(page.getByTestId('construction-panel')).toHaveCount(0)
})
