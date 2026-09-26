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

test('production buttons stay inside the completed construction panel', async ({ page }) => {
  test.setTimeout(30_000)
  await page.goto('/?scenario=economy&aggression=passive')
  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1), { timeout: 15_000 })
    .toBeGreaterThan(0)

  await selectEconomyBase(page)
  await expect(page.getByTestId('construction-panel')).toContainText('Construction complete.')
  await expect(page.getByTestId('train-pawn')).toBeVisible()
  await expect(page.getByTestId('train-warrior')).toHaveCount(0)
  await expect(page.getByTestId('production-queue-count')).toHaveText('Queue 0/5')
  const queueBelowButtons = await page
    .getByTestId('production-queue-count')
    .evaluate((queue) => queue.previousElementSibling?.querySelector('button') !== null)
  expect(queueBelowButtons).toBe(true)
  await page.getByTestId('train-pawn').click()
  await expect(page.getByTestId('production-queue-count')).toHaveText('Queue 1/5')
  await expect(page.getByTestId('training-status')).toHaveText(/Pawn · \d+\/100 · Training/)

  const worker = (await workerIds(page))[0]!
  await selectWorker(page, worker)
  await page.getByRole('button', { name: 'Barracks · 150', exact: true }).click()
  const target = { x: tilesToFixed(11), y: tilesToFixed(9) }
  const targetPoint = await canvasPoint(page, target.x + FIXED_SCALE / 2, target.y + FIXED_SCALE / 2)
  await page.mouse.click(targetPoint.x, targetPoint.y)
  await expect.poll(() => constructionAt(page, target), { timeout: 20_000 }).toMatchObject({ status: 'COMPLETED' })

  await page.mouse.click(targetPoint.x, targetPoint.y)
  const panel = page.getByTestId('construction-panel')
  await expect(panel).toContainText('Construction complete.')
  await expect(page.getByTestId('production-panel')).toHaveCSS('border-top-width', '0px')
  await expect(page.getByTestId('train-warrior')).toBeVisible()
  await expect(page.getByTestId('train-archer')).toBeVisible()
  await expect(page.getByTestId('train-pawn')).toHaveCount(0)
})

test('sets a rally point and sends a trained unit toward it', async ({ page }) => {
  test.setTimeout(30_000)
  await page.goto('/?scenario=economy&aggression=passive')
  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1), { timeout: 15_000 })
    .toBeGreaterThan(0)

  await selectEconomyBase(page)
  await expect(page.getByTestId('set-rally')).toBeVisible()

  await page.getByTestId('set-rally').click()
  const rallyTarget = { x: tilesToFixed(11.5), y: tilesToFixed(10) }
  const rallyPoint = await canvasPoint(page, rallyTarget.x, rallyTarget.y)
  await page.mouse.click(rallyPoint.x, rallyPoint.y, { button: 'right' })
  await expect(page.getByTestId('rally-point')).toHaveText(`Rally: ${rallyTarget.x}, ${rallyTarget.y}`)

  const before = await workerIds(page)
  await page.getByTestId('train-pawn').click()
  await expect(page.getByTestId('training-status')).toHaveText(/Pawn · \d+\/100 · Training/)
  await expect.poll(() => workerIds(page), { timeout: 15_000 }).toHaveLength(before.length + 1)

  const spawnedId = (await workerIds(page)).find((id) => !before.includes(id))!
  await expect
    .poll(() => page.evaluate((id) => window.__rtsDebug!.getPositions()[String(id)]!, spawnedId), { timeout: 5_000 })
    .toMatchObject({ x: expect.any(Number), y: expect.any(Number) })
})

test('shows blocked production until the exit is released', async ({ page }) => {
  test.setTimeout(35_000)
  await page.goto('/?scenario=economy&aggression=passive')
  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1), { timeout: 15_000 })
    .toBeGreaterThan(0)

  const worker = (await workerIds(page))[0]!
  await selectWorker(page, worker)
  const exitTarget = { x: tilesToFixed(11.5), y: tilesToFixed(8) }
  const exit = await canvasPoint(page, exitTarget.x, exitTarget.y)
  await page.mouse.click(exit.x, exit.y, { button: 'right' })
  await expect
    .poll(() => page.evaluate((id) => window.__rtsDebug!.getPositions()[String(id)]!, worker), { timeout: 5_000 })
    .toMatchObject({ x: exitTarget.x, y: exitTarget.y })

  await selectEconomyBase(page)
  await page.getByTestId('train-pawn').click()
  await expect(page.getByTestId('training-status')).toHaveText(/Pawn · 100\/100 · Waiting for exit/, {
    timeout: 15_000
  })

  await selectWorker(page, worker)
  await page.evaluate((id) => window.__rtsDebug!.setSelection([id]), worker)
  const release = await canvasPoint(page, tilesToFixed(12), tilesToFixed(10))
  await page.mouse.click(release.x, release.y, { button: 'right' })
  await expect.poll(() => workerIds(page), { timeout: 20_000 }).toHaveLength(5)
})
