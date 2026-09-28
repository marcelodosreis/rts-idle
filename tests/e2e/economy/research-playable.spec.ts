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
  await expect(page.getByTestId('construction-panel')).toContainText('Castle II · Ready')
}

async function selectMonastery(page: Page): Promise<void> {
  const monasteryPoint = await canvasPoint(
    page,
    MONASTERY_TARGET.x + tilesToFixed(0.5),
    MONASTERY_TARGET.y + tilesToFixed(0.5)
  )
  await page.mouse.click(monasteryPoint.x, monasteryPoint.y)
  await expect(page.getByTestId('production-panel')).toBeVisible()
}

async function prepareResearch(page: Page): Promise<void> {
  await startResearchScenario(page)
  await selectEconomyBase(page)
  await selectMonastery(page)
  const productionButtons = page.getByTestId('production-panel').locator('button')
  await expect(productionButtons.nth(0)).toHaveAttribute('data-testid', 'train-monk')
  await expect(productionButtons.nth(1)).toHaveAttribute('data-testid', 'research-attack')
}

test('starts with Castle II and Monastery research, then cancels a queued topic', async ({ page }) => {
  test.setTimeout(60_000)
  await prepareResearch(page)

  const research = page.getByTestId('research-economy')
  await expect(research).toBeEnabled()
  await research.click()
  await expect(page.getByTestId('production-item-0')).toHaveAttribute('data-production-status', 'ACTIVE')
  const beforeCancel = Number((await page.getByTestId('hud-resource-mineral').textContent())?.match(/\d+/)?.[0] ?? 0)
  const cancel = page.getByTestId('cancel-research-0')
  await cancel.click()
  await expect(cancel).toHaveText('Confirm')
  await cancel.click()
  await expect(page.getByTestId('production-queue-empty')).toContainText('No units or research in queue.')
  await expect
    .poll(() => page.getByTestId('hud-resource-mineral').textContent(), { timeout: 5_000 })
    .not.toBe(String(beforeCancel))
})

test('uses the same queue card dimensions for research and units', async ({ page }) => {
  test.setTimeout(60_000)
  await prepareResearch(page)

  await page.getByTestId('research-economy').click()
  await page.getByTestId('train-monk').click()
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

  await page.getByTestId('research-economy').click()
  await expect(page.getByTestId('production-item-0')).toHaveAttribute('data-production-status', 'ACTIVE')
  await expect(page.getByTestId('production-queue-empty')).toContainText('No units or research in queue.', {
    timeout: 70_000
  })
  const lockedResearch = page.getByTestId('research-economy')
  await expect(lockedResearch).toBeDisabled()
  await lockedResearch.locator('..').hover()
  await expect(page.getByRole('tooltip')).toContainText('Already completed.')

  const worker = (await workerIds(page)).at(-1)
  if (worker === undefined) {
    throw new Error('research scenario has no worker')
  }
  await selectWorker(page, worker)
  await page.getByRole('button', { name: new RegExp(`Worker #${worker}`) }).hover()
  await expect(page.getByRole('tooltip')).toContainText('Cargo capacity: 12')
})
