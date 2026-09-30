import { expect, type Page, test } from '@playwright/test'
import { tilesToFixed } from '@rts/shared'

const MONASTERY_TARGET = { x: tilesToFixed(11), y: tilesToFixed(9) }

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

async function startResearchScenario(page: Page): Promise<void> {
  await page.goto('/?scenario=research')
  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1), { timeout: 15_000 })
    .toBeGreaterThan(0)
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

async function selectEconomyBase(page: Page): Promise<void> {
  const origin = await page.evaluate(() => {
    const buildings = Object.values(window.__rtsDebug?.getConstructionStates() ?? {})
    return buildings.sort((left, right) => left.x - right.x)[0]!
  })
  const point = await canvasPoint(page, origin.x + tilesToFixed(2.5), origin.y + tilesToFixed(2))
  await page.mouse.click(point.x, point.y)
  await expect(page.getByTestId('construction-panel')).toContainText('Castle II')
  await expect(page.getByTestId('construction-panel').getByText('Ready', { exact: true }).first()).toBeVisible()
}

async function selectMonastery(page: Page): Promise<void> {
  const monasteryPoint = await focusFixed(
    page,
    MONASTERY_TARGET.x + tilesToFixed(1.5),
    MONASTERY_TARGET.y + tilesToFixed(2.5)
  )
  await page.mouse.click(monasteryPoint.x, monasteryPoint.y)
  await expect(page.getByTestId('production-panel')).toBeVisible()
}

async function prepareResearch(page: Page): Promise<void> {
  await startResearchScenario(page)
  await selectEconomyBase(page)
  await selectMonastery(page)
  await expect(page.getByRole('button', { name: 'Train', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Research', exact: true })).toBeVisible()
}

async function openRoot(page: Page): Promise<void> {
  const back = page.getByRole('button', { name: 'Back', exact: true })
  if (await back.isVisible()) {
    await back.click()
  }
}

async function startResearch(page: Page, researchType: string): Promise<void> {
  await openRoot(page)
  await page.getByRole('button', { name: 'Research', exact: true }).click()
  await page.getByTestId(`research-${researchType}`).click()
}

async function train(page: Page, unitKind: string): Promise<void> {
  await openRoot(page)
  await page.getByRole('button', { name: 'Train', exact: true }).click()
  await page.getByTestId(`train-${unitKind}`).click()
}

test('starts with Castle II and Monastery research, then cancels a queued topic', async ({ page }) => {
  test.setTimeout(60_000)
  await prepareResearch(page)

  await startResearch(page, 'economy')
  await expect(page.getByTestId('production-item-0')).toHaveAttribute('data-production-status', 'ACTIVE')
  const beforeCancel = Number((await page.getByTestId('hud-resource-mineral').textContent())?.match(/\d+/)?.[0] ?? 0)
  await openRoot(page)
  const cancel = page.getByTestId('cancel-current')
  await cancel.click()
  await expect(cancel).toContainText('Confirm')
  await cancel.click()
  await expect(page.getByTestId('production-queue-empty')).toContainText('No units or research in queue.')
  await expect
    .poll(() => page.getByTestId('hud-resource-mineral').textContent(), { timeout: 5_000 })
    .not.toBe(String(beforeCancel))
})

test('uses the same queue card dimensions for research and units', async ({ page }) => {
  test.setTimeout(60_000)
  await prepareResearch(page)

  await startResearch(page, 'economy')
  await train(page, 'monk')
  await expect(page.getByTestId('production-item-0')).toHaveAttribute('data-production-status', 'ACTIVE')
  await expect(page.getByTestId('production-item-1')).toHaveAttribute('data-production-status', 'QUEUED')
  const researchCard = await page.getByTestId('production-item-0').boundingBox()
  const unitCard = await page.getByTestId('production-item-1').boundingBox()
  if (researchCard === null || unitCard === null) {
    throw new Error('queue cards are not measurable')
  }
  expect(Math.abs(researchCard.width - unitCard.width)).toBeLessThan(1)
  expect(researchCard.height).toBe(unitCard.height)
})

test('completed Economy research changes the selected Pawn tooltip', async ({ page }) => {
  test.setTimeout(100_000)
  await prepareResearch(page)

  await startResearch(page, 'economy')
  await expect(page.getByTestId('production-item-0')).toHaveAttribute('data-production-status', 'ACTIVE')
  await expect(page.getByTestId('production-queue-empty')).toContainText('No units or research in queue.', {
    timeout: 70_000
  })
  await openRoot(page)
  await page.getByRole('button', { name: 'Research', exact: true }).click()
  const lockedResearch = page.getByTestId('research-economy')
  await expect(lockedResearch).toHaveAttribute('aria-disabled', 'true')
  await lockedResearch.hover()
  await expect(page.getByText('Already completed.', { exact: true })).toBeVisible()

  const worker = (await workerIds(page)).at(-1)
  if (worker === undefined) {
    throw new Error('research scenario has no worker')
  }
  await selectWorker(page, worker)
  await page.getByRole('button', { name: `Details for Worker #${worker}` }).click()
  await expect(page.getByText('Cargo capacity: 12', { exact: true })).toBeVisible()
})
