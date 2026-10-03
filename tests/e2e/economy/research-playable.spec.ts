import { expect, type Page, test } from '@playwright/test'
import { tilesToFixed } from '@rts/shared'
import { waitForMatchReady, waitForStableCamera } from '../support/settle.js'

const MONASTERY_TARGET = { x: tilesToFixed(11), y: tilesToFixed(10) }

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
  await waitForStableCamera(page, x, y)
  return canvasPoint(page, x, y)
}

async function startResearchScenario(page: Page): Promise<void> {
  await page.goto('/?scenario=regression&aggression=passive')
  await waitForMatchReady(page)
}

async function workerIds(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const owners = window.__rtsDebug?.getUnitOwners() ?? {}
    const kinds = window.__rtsDebug?.getUnitKinds() ?? {}
    return Object.entries(owners)
      .filter(([id, owner]) => owner === 0 && kinds[id] === 'pawn')
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
  await expect(page.getByTestId('construction-panel')).toContainText('Castle I')
}

async function upgradeCastle(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Upgrade', exact: true }).click()
  await page.getByTestId('upgrade-castle').click()
  const panel = page.getByTestId('construction-panel')
  await expect(panel).toContainText('Castle II')
  await expect(panel.getByText('Ready', { exact: true }).first()).toBeVisible({ timeout: 20_000 })
}

async function constructionAt(page: Page, target: { readonly x: number; readonly y: number }): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(({ x, y }) => {
          const states = Object.values(window.__rtsDebug?.getConstructionStates() ?? {})
          return states.find((construction) => construction.x === x && construction.y === y) ?? null
        }, target),
      { timeout: 20_000 }
    )
    .toMatchObject({ status: 'COMPLETED' })
}

async function buildMonastery(page: Page): Promise<void> {
  const worker = (await workerIds(page))[0]
  if (worker === undefined) {
    throw new Error('regression scenario has no worker for Monastery construction')
  }
  await selectWorker(page, worker)
  await page.getByRole('button', { name: 'Build', exact: true }).click()
  await page.getByTestId('build-monastery').click()
  const targetPoint = await focusFixed(
    page,
    MONASTERY_TARGET.x + tilesToFixed(0.5),
    MONASTERY_TARGET.y + tilesToFixed(0.5)
  )
  await page.mouse.click(targetPoint.x, targetPoint.y)
  await constructionAt(page, MONASTERY_TARGET)
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
}

async function selectMonastery(page: Page): Promise<void> {
  const monasteryPoint = await focusFixed(
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
  await upgradeCastle(page)
  await buildMonastery(page)
  await selectMonastery(page)
  await expect(page.getByRole('button', { name: 'Train', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Research', exact: true })).toBeVisible()
}

async function prepareCastleII(page: Page): Promise<void> {
  await startResearchScenario(page)
  await selectEconomyBase(page)
  await upgradeCastle(page)
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
  const beforeCancel = Number((await page.getByTestId('hud-resource-gold').textContent())?.match(/\d+/)?.[0] ?? 0)
  await openRoot(page)
  const cancel = page.getByTestId('cancel-current')
  await cancel.click()
  await expect(cancel).toContainText('Confirm')
  await cancel.click()
  await expect(page.getByTestId('production-queue-empty')).toContainText('No units or research in queue.')
  await expect
    .poll(() => page.getByTestId('hud-resource-gold').textContent(), { timeout: 5_000 })
    .not.toBe(String(beforeCancel))
})

test('shows the unavailable Castle III upgrade after reaching Castle II', async ({ page }) => {
  await prepareCastleII(page)

  await selectEconomyBase(page)
  await page.getByRole('button', { name: 'Upgrade', exact: true }).click()
  const castleIii = page.getByTestId('upgrade-castle')
  await expect(castleIii).toHaveText('Castle III')
  await expect(castleIii).toHaveAttribute('aria-disabled', 'true')
  await castleIii.hover()
  await expect(page.getByText('Castle III content is unavailable.', { exact: true }).first()).toBeVisible()
})

test('uses the same queue card dimensions for research and units', async ({ page }) => {
  test.setTimeout(60_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
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
  expect(Math.abs(researchCard.width - unitCard.width)).toBeLessThan(3)
  expect(Math.abs(researchCard.height - unitCard.height)).toBeLessThan(1)
  expect(researchCard.height).toBeGreaterThanOrEqual(48)
  const emptySlot = await page.getByTestId('production-slot-2').boundingBox()
  expect(emptySlot?.height).toBeGreaterThanOrEqual(48)
})

test('completed Economy research changes the selected Pawn tooltip', async ({ page }) => {
  test.setTimeout(100_000)
  await prepareResearch(page)

  await startResearch(page, 'economy')
  await expect(page.getByTestId('production-item-0')).toHaveAttribute('data-production-status', 'ACTIVE')
  await expect(page.getByTestId('production-queue-empty')).toContainText('No units or research in queue.', {
    timeout: 70_000
  })
  await expect(page.getByText('Research complete', { exact: true })).toBeVisible()
  await expect(page.getByText('Economy Research', { exact: true })).toBeVisible()
  await expect(page.getByText('Research complete', { exact: true })).toHaveCount(1)
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
