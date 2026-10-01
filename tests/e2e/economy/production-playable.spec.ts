import { expect, type Page, test } from '@playwright/test'
import { FIXED_SCALE, tilesToFixed } from '@rts/shared'

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
  return canvasPoint(page, x, y)
}

async function workerIds(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const owners = window.__rtsDebug?.getUnitOwners() ?? {}
    return Object.entries(owners)
      .filter(([, owner]) => owner === 0)
      .map(([id]) => Number(id))
  })
}

async function selectWorker(page: Page, id: number): Promise<void> {
  const position = await page.evaluate((workerId) => window.__rtsDebug!.getPositions()[String(workerId)]!, id)
  const point = await canvasPoint(page, position.x, position.y)
  await page.mouse.click(point.x, point.y)
  await expect.poll(() => page.evaluate(() => window.__rtsDebug!.getSelection()), { timeout: 5_000 }).toContain(id)
}

async function constructionAt(page: Page, target: { readonly x: number; readonly y: number }) {
  return page.evaluate(
    ({ x, y }) =>
      Object.values(window.__rtsDebug?.getConstructionStates() ?? {}).find(
        (construction) => construction.x === x && construction.y === y
      ) ?? null,
    target
  )
}

async function selectEconomyBase(page: Page): Promise<void> {
  const origin = await page.evaluate(() => {
    const buildings = Object.values(window.__rtsDebug?.getConstructionStates() ?? {})
    return buildings.sort((left, right) => left.x - right.x)[0]!
  })
  const base = await canvasPoint(page, origin.x + tilesToFixed(2.5), origin.y + tilesToFixed(2))
  await page.mouse.click(base.x, base.y)
}

async function queueLength(page: Page): Promise<number> {
  return page.locator('[data-testid^="production-item-"]').count()
}

async function goldValue(page: Page): Promise<number> {
  const text = await page.getByTestId('hud-resource-gold').textContent()
  return Number(text?.match(/\d+/)?.[0] ?? 0)
}

async function cancelFirstQueuedProduction(page: Page): Promise<void> {
  const back = page.getByRole('button', { name: 'Back', exact: true })
  if (await back.isVisible()) {
    await back.click()
  }
  const cancel = page.getByTestId('cancel-current')
  await expect(cancel).toBeVisible()
  await cancel.click()
  await expect(cancel).toContainText('Confirm')
  await cancel.click()
}

async function train(page: Page, unitKind: string): Promise<void> {
  const trainMenu = page.getByRole('button', { name: 'Train', exact: true })
  if (await trainMenu.isVisible()) {
    await trainMenu.click()
  }
  await page.getByTestId(`train-${unitKind}`).click()
}

async function armBuild(page: Page, buildingType: string): Promise<void> {
  await page.getByRole('button', { name: 'Build', exact: true }).click()
  await page.getByTestId(`build-${buildingType.toLowerCase()}`).click()
}

test('production buttons stay inside the completed construction panel', async ({ page }) => {
  test.setTimeout(30_000)
  await page.goto('/?scenario=regression')
  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1), { timeout: 15_000 })
    .toBeGreaterThan(0)

  await selectEconomyBase(page)
  await expect(page.getByRole('button', { name: 'Train', exact: true })).toBeVisible()
  await expect(page.getByTestId('train-warrior')).toHaveCount(0)
  await expect(page.getByTestId('production-queue-count')).toHaveText('Queue 0/5')
  await expect(page.getByTestId('production-panel').locator('button')).toHaveCount(0)
  await train(page, 'pawn')
  await expect(page.getByTestId('production-queue-count')).toHaveText('Queue 1/5')
  await expect(page.getByTestId('production-item-0')).toHaveAttribute('data-production-status', 'ACTIVE')
  await expect(page.getByTestId('production-active')).toHaveAttribute('data-production-feedback', /started|idle/)

  const worker = (await workerIds(page))[0]!
  await selectWorker(page, worker)
  await armBuild(page, 'BARRACKS')
  const target = { x: tilesToFixed(12), y: tilesToFixed(10) }
  const targetPoint = await focusFixed(page, target.x + FIXED_SCALE / 2, target.y + FIXED_SCALE / 2)
  await page.mouse.click(targetPoint.x, targetPoint.y)
  await expect.poll(() => constructionAt(page, target), { timeout: 20_000 }).toMatchObject({ status: 'COMPLETED' })

  await page.mouse.click(targetPoint.x, targetPoint.y)
  await expect(page.getByRole('button', { name: 'Train', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Train', exact: true }).click()
  await expect(page.getByTestId('train-warrior')).toBeVisible()
  await expect(page.getByTestId('train-archer')).toBeVisible()
  await expect(page.getByTestId('train-pawn')).toHaveCount(0)
})

test('cancels any queued production row with confirmation and refund feedback', async ({ page }) => {
  test.setTimeout(30_000)
  await page.goto('/?scenario=regression')
  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1), { timeout: 15_000 })
    .toBeGreaterThan(0)

  await selectEconomyBase(page)
  for (let count = 1; count <= 5; count += 1) {
    await train(page, 'pawn')
    await expect(page.getByTestId('production-queue-count')).toHaveText(/Queue [1-5]\/5/)
  }
  await expect.poll(() => queueLength(page)).toBeGreaterThanOrEqual(2)
  await expect(page.getByTestId('hud-resource-gold')).toContainText('0')
  const queueFitsSelection = await page
    .getByRole('list', { name: 'Production and research queue' })
    .evaluate((queue) => queue.scrollWidth <= queue.clientWidth)
  expect(queueFitsSelection).toBe(true)
  await expect(page.getByTestId('production-item-1')).toHaveAttribute('data-production-status', 'QUEUED')

  await page.getByTestId('train-pawn').click({ force: true })
  const localBlock = page.getByTestId('hud-context-feedback')
  await expect(localBlock).toHaveText(/Queue is full|Insufficient gold/)
  const blockTarget = await localBlock.getAttribute('data-feedback-target')
  if (blockTarget === 'queue') {
    await expect(page.getByTestId('production-panel')).toHaveAttribute('data-queue-attention', 'true')
  } else {
    await expect(page.getByTestId('hud-resource-mineral')).toHaveAttribute('data-feedback-highlight', 'true')
  }
  await expect(page.getByRole('alert')).toHaveCount(0)

  const beforeFirstCancel = await queueLength(page)
  await cancelFirstQueuedProduction(page)
  await expect.poll(() => queueLength(page)).toBeLessThan(beforeFirstCancel)
  await expect.poll(() => goldValue(page)).toBeGreaterThan(0)

  const firstRefund = await goldValue(page)
  const beforeSecondCancel = await queueLength(page)
  await cancelFirstQueuedProduction(page)
  await expect.poll(() => queueLength(page)).toBeLessThan(beforeSecondCancel)
  await expect.poll(() => goldValue(page)).toBeGreaterThan(firstRefund)
})

test('sets a rally point and sends a trained unit toward it', async ({ page }) => {
  test.setTimeout(30_000)
  await page.goto('/?scenario=regression')
  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1), { timeout: 15_000 })
    .toBeGreaterThan(0)

  await selectEconomyBase(page)
  await expect(page.getByTestId('rally')).toBeVisible()

  await page.getByTestId('rally').click()
  const rallyTarget = { x: tilesToFixed(13.5), y: tilesToFixed(12) }
  const rallyPoint = await focusFixed(page, rallyTarget.x, rallyTarget.y)
  await page.mouse.click(rallyPoint.x, rallyPoint.y, { button: 'right' })
  await expect
    .poll(async () => {
      const text = await page.getByTestId('rally-point').textContent()
      const values = text?.match(/Rally: (\d+), (\d+)/)
      return (
        values !== null &&
        values !== undefined &&
        Math.abs(Number(values[1]) - rallyTarget.x) <= 8 &&
        Math.abs(Number(values[2]) - rallyTarget.y) <= 8
      )
    })
    .toBe(true)

  const before = await workerIds(page)
  await train(page, 'pawn')
  await expect(page.getByTestId('production-item-0')).toHaveAttribute('data-production-status', 'ACTIVE')
  await page.waitForTimeout(1_200)
  await expect(page.getByTestId('hud-resource-supply-delta')).toHaveCount(0)
  await expect.poll(() => workerIds(page), { timeout: 15_000 }).toHaveLength(before.length + 1)
  await expect(page.getByTestId('hud-resource-supply-delta')).toHaveText('+1')

  const spawnedId = (await workerIds(page)).find((id) => !before.includes(id))!
  await expect
    .poll(() => page.evaluate((id) => window.__rtsDebug!.getPositions()[String(id)]!, spawnedId), { timeout: 5_000 })
    .toMatchObject({ x: expect.any(Number), y: expect.any(Number) })
})

test('shows blocked production until the exit is released', async ({ page }) => {
  test.setTimeout(35_000)
  await page.goto('/?scenario=regression')
  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1), { timeout: 15_000 })
    .toBeGreaterThan(0)

  await selectEconomyBase(page)
  const before = await workerIds(page)
  await train(page, 'pawn')
  await expect.poll(() => workerIds(page), { timeout: 15_000 }).toHaveLength(before.length + 1)
  const blocker = (await workerIds(page)).find((id) => !before.includes(id))!

  await train(page, 'pawn')
  await expect(page.getByTestId('production-item-0')).toHaveAttribute('data-production-status', 'COMPLETED_WAITING', {
    timeout: 15_000
  })
  await expect(page.getByTestId('production-status-0')).toHaveText('Waiting for exit')

  await selectWorker(page, blocker)
  const release = await canvasPoint(page, tilesToFixed(9), tilesToFixed(10))
  await page.mouse.click(release.x, release.y, { button: 'right' })
  await expect.poll(() => workerIds(page), { timeout: 20_000 }).toHaveLength(before.length + 2)
})
