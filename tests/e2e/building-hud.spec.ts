import { expect, test } from '@playwright/test'
import { FIXED_SCALE, tilesToFixed } from '@rts/shared'

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
    return Object.entries(owners)
      .filter(([, owner]) => owner === 0)
      .map(([id]) => Number(id))
  })
}

async function selectWorker(page: import('@playwright/test').Page, id: number): Promise<void> {
  const position = await page.evaluate((workerId) => window.__rtsDebug!.getPositions()[String(workerId)]!, id)
  const point = await canvasPointForFixed(page, position.x, position.y)
  await page.mouse.click(point.x, point.y)
}

async function startMatch(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/?scenario=economy&aggression=passive')
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1)).toBeGreaterThan(0)
}

async function constructionAt(
  page: import('@playwright/test').Page,
  target: { readonly x: number; readonly y: number }
) {
  return page.evaluate(
    ({ x, y }) =>
      Object.values(window.__rtsDebug?.getConstructionStates() ?? {}).find(
        (construction) => construction.x === x && construction.y === y
      ) ?? null,
    target
  )
}

test('construction HUD uses the concise building labels and preserves costs', async ({ page }) => {
  await startMatch(page)

  const workerId = (await workerIds(page))[0]!
  expect(workerId).toBeGreaterThan(0)
  await selectWorker(page, workerId)

  await expect(page.getByRole('button', { name: 'Base · 100', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Barracks · 150', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Build Base · 100', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Build Barracks · 150', exact: true })).toHaveCount(0)
})

test('construction stays at the clicked location while the worker travels', async ({ page }) => {
  test.setTimeout(30_000)
  await startMatch(page)

  const workerId = (await workerIds(page))[0]!
  expect(workerId).toBeGreaterThan(0)
  await selectWorker(page, workerId)
  await page.getByRole('button', { name: 'Base · 100', exact: true }).click()

  const target = { x: tilesToFixed(10), y: tilesToFixed(9) }
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
    .toMatchObject({ x: target.x, y: target.y, status: 'FOUNDATION' })
  await expect
    .poll(() => constructionAt(page, target), { timeout: 20_000 })
    .toMatchObject({
      x: target.x,
      y: target.y,
      status: 'COMPLETED'
    })

  await page.mouse.click(point.x, point.y)
  await expect(page.getByTestId('construction-panel')).toContainText('Base · Ready')
  await expect(page.getByTestId('construction-panel')).not.toContainText('100/100')
  await expect(page.getByTestId('construction-panel')).not.toContainText('No worker assigned')
  await expect(page.getByTestId('construction-panel')).toContainText('Construction complete.')
})

test('construction preview explains an occupied location before sending a command', async ({ page }) => {
  test.setTimeout(30_000)
  await startMatch(page)
  const workers = await workerIds(page)
  await selectWorker(page, workers[0]!)
  await page.getByRole('button', { name: 'Base · 100', exact: true }).click()

  const target = { x: tilesToFixed(10), y: tilesToFixed(9) }
  const targetPoint = await canvasPointForFixed(page, target.x + FIXED_SCALE / 2, target.y + FIXED_SCALE / 2)
  await page.mouse.click(targetPoint.x, targetPoint.y)
  await expect.poll(() => constructionAt(page, target), { timeout: 15_000 }).toMatchObject({ status: 'COMPLETED' })

  await selectWorker(page, workers[1]!)
  await page.getByRole('button', { name: 'Barracks · 150', exact: true }).click()
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
  await page.getByRole('button', { name: 'Base · 100', exact: true }).click()

  const target = { x: tilesToFixed(10), y: tilesToFixed(9) }
  const targetPoint = await canvasPointForFixed(page, target.x + FIXED_SCALE / 2, target.y + FIXED_SCALE / 2)
  await page.mouse.click(targetPoint.x, targetPoint.y)

  await expect.poll(() => constructionAt(page, target)).toMatchObject({ status: 'UNDER_CONSTRUCTION' })

  await selectWorker(page, builder)
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await page.mouse.click(targetPoint.x, targetPoint.y)
  await expect(page.getByTestId('construction-panel')).toContainText('Paused')
  await expect(page.getByTestId('construction-status')).toContainText('No worker assigned')
  const pausedProgress = await page.getByTestId('construction-status').textContent()

  await selectWorker(page, replacement)
  await page.mouse.click(targetPoint.x, targetPoint.y, { button: 'right' })
  await page.mouse.click(targetPoint.x, targetPoint.y)
  await expect(page.getByTestId('construction-panel')).toContainText(`Worker #${replacement}`)
  await expect(page.getByTestId('construction-panel')).not.toContainText('Paused')

  await expect.poll(() => page.getByTestId('construction-status').textContent()).not.toBe(pausedProgress)
  await expect(page.getByTestId('construction-panel')).toContainText('Construction complete.', { timeout: 15_000 })
})
