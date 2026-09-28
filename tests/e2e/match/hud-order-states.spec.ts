import { expect, type Page, test } from '@playwright/test'
import { tilesToFixed } from '@rts/shared'

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

async function focusFixed(page: Page, x: number, y: number) {
  await page.evaluate(([fixedX, fixedY]) => window.__rtsDebug?.moveCamera(fixedX, fixedY), [x, y] as const)
  return canvasPointForFixed(page, x, y)
}

async function selectWorker(page: Page, id: number): Promise<void> {
  const position = await page.evaluate((workerId) => window.__rtsDebug!.getPositions()[String(workerId)]!, id)
  const point = await canvasPointForFixed(page, position.x, position.y)
  await page.mouse.click(point.x, point.y)
}

async function workerPosition(page: Page, id: number): Promise<{ readonly x: number; readonly y: number }> {
  return page.evaluate((workerId) => window.__rtsDebug!.getPositions()[String(workerId)]!, id)
}

async function startMatch(page: Page): Promise<number> {
  await page.goto('/?scenario=default')
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1)).toBeGreaterThan(0)
  const workers = await page.evaluate(() => {
    const owners = window.__rtsDebug?.getUnitOwners() ?? {}
    return Object.entries(owners)
      .filter(([, owner]) => owner === 0)
      .map(([id]) => Number(id))
  })
  expect(workers.length).toBeGreaterThan(0)
  for (const workerId of workers) {
    await selectWorker(page, workerId)
    if (await page.getByText('1 · Worker', { exact: true }).isVisible()) {
      return workerId
    }
  }
  throw new Error('could not select a Worker through the canvas')
}

test('HUD exposes Hold, Patrol, and Attack-move order states', async ({ page }) => {
  test.setTimeout(30_000)
  const workerId = await startMatch(page)
  await selectWorker(page, workerId)

  await page.getByRole('button', { name: 'Hold', exact: true }).click()
  await expect(
    page.getByRole('button', { name: new RegExp(`Worker #${workerId}, owner 0, Holding position`) })
  ).toBeVisible()

  await page.getByRole('button', { name: 'Patrol', exact: true }).click()
  const current = await workerPosition(page, workerId)
  const patrolPoint = await focusFixed(page, current.x + tilesToFixed(5), current.y - tilesToFixed(5))
  await page.mouse.click(patrolPoint.x, patrolPoint.y, { button: 'right' })
  await expect(page.getByRole('button', { name: new RegExp(`Worker #${workerId}, owner 0, Patrolling`) })).toBeVisible()

  const attackWorkerId = await startMatch(page)
  await selectWorker(page, attackWorkerId)
  await page.getByRole('button', { name: 'Attack-move', exact: true }).click()
  const attackMovePosition = await workerPosition(page, attackWorkerId)
  const attackMovePoint = await focusFixed(
    page,
    attackMovePosition.x + tilesToFixed(5),
    attackMovePosition.y - tilesToFixed(5)
  )
  await page.mouse.click(attackMovePoint.x, attackMovePoint.y, { button: 'right' })
  await expect(
    page.getByRole('button', { name: new RegExp(`Worker #${attackWorkerId}, owner 0, Attack-moving`) })
  ).toBeVisible()
})
