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

test('production buttons stay inside the completed construction panel', async ({ page }) => {
  test.setTimeout(30_000)
  await page.goto('/?scenario=economy&aggression=passive')
  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1), { timeout: 15_000 })
    .toBeGreaterThan(0)

  const base = await canvasPoint(page, tilesToFixed(7), tilesToFixed(9))
  await page.mouse.click(base.x, base.y)
  await expect(page.getByTestId('construction-panel')).toContainText('Construction complete.')
  await expect(page.getByTestId('train-pawn')).toBeVisible()
  await expect(page.getByTestId('train-warrior')).toHaveCount(0)
  const productionPanel = page.getByTestId('production-panel')
  await expect(productionPanel.locator('p')).toHaveText('Queue 0/5')
  const queueBelowButtons = await productionPanel
    .locator('p')
    .evaluate((queue) => queue.previousElementSibling?.querySelector('button') !== null)
  expect(queueBelowButtons).toBe(true)
  await page.getByTestId('train-pawn').click()
  await expect(page.getByTestId('production-queue-count')).toHaveText('Queue 1/5')
  await expect(page.getByTestId('training-status')).toHaveText(/Pawn · \d+\/100 · Training/)

  const worker = (await workerIds(page))[0]!
  await selectWorker(page, worker)
  await page.getByRole('button', { name: 'Barracks · 150', exact: true }).click()
  const target = { x: tilesToFixed(10), y: tilesToFixed(9) }
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
