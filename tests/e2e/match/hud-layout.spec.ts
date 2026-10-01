import { expect, type Page, test } from '@playwright/test'
import { waitForMatchReady } from '../support/settle.js'

interface UnitCatalogEntry {
  readonly id: number
  readonly owner: number
  readonly kind: string
}

interface UnitCatalog {
  readonly units: readonly UnitCatalogEntry[]
}

async function startMatch(page: Page): Promise<UnitCatalog> {
  await page.goto('/?scenario=8v8&aggression=passive')
  await waitForMatchReady(page)
  return page.evaluate(() => {
    const owners = window.__rtsDebug?.getUnitOwners() ?? {}
    const kinds = window.__rtsDebug?.getUnitKinds() ?? {}
    return {
      units: Object.keys(owners).map((key) => ({
        id: Number(key),
        owner: owners[key] ?? -1,
        kind: kinds[key] ?? 'unknown'
      }))
    }
  })
}

async function select(page: Page, ids: readonly number[]): Promise<void> {
  await page.evaluate((selectedIds) => window.__rtsDebug?.setSelection(selectedIds), ids)
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getSelection() ?? [])).toEqual(ids)
}

function unitId(catalog: UnitCatalog, owner: number, kind: string): number {
  const unit = catalog.units.find((candidate) => candidate.owner === owner && candidate.kind === kind)
  if (unit === undefined) {
    throw new Error(`missing ${kind} for owner ${owner}`)
  }
  return unit.id
}

test('worker and military commands keep their fixed slots', async ({ page }) => {
  const catalog = await startMatch(page)
  await select(page, [unitId(catalog, 0, 'pawn')])

  await expect(page.getByTestId('command-slot-1').locator('[data-command-id]')).toHaveAttribute(
    'data-command-id',
    'stop'
  )
  await expect(page.getByTestId('command-slot-6').locator('[data-command-id]')).toHaveAttribute(
    'data-command-id',
    'gather'
  )
  await expect(page.getByTestId('command-slot-7').locator('[data-command-id]')).toHaveAttribute(
    'data-command-id',
    'repair'
  )
  await expect(page.getByTestId('command-slot-8').locator('[data-command-id]')).toHaveAttribute(
    'data-command-id',
    'build'
  )
  await expect(page.getByTestId('command-slot-9').locator('[data-command-id]')).toHaveAttribute(
    'data-command-id',
    'deposit'
  )

  await select(page, [unitId(catalog, 0, 'warrior')])
  await expect(page.getByTestId('command-slot-4').locator('[data-command-id]')).toHaveAttribute(
    'data-command-id',
    'attack'
  )
  await expect(page.getByTestId('command-slot-5').locator('[data-command-id]')).toHaveAttribute(
    'data-command-id',
    'attack-move'
  )
  await expect(page.getByTestId('command-slot-6').locator('[data-command-id]')).toHaveCount(0)
  await expect(page.locator('[data-command-id]')).toHaveCount(5)
})

test('monk and enemy selection preserve commands while explaining disabled actions', async ({ page }) => {
  const catalog = await startMatch(page)
  await select(page, [unitId(catalog, 0, 'monk')])
  const monkAttack = page.getByTestId('attack')
  await expect(monkAttack).toHaveAttribute('aria-disabled', 'true')
  await monkAttack.hover()
  await expect(page.getByText('Monks cannot attack.', { exact: true })).toBeVisible()

  await select(page, [unitId(catalog, 1, 'warrior')])
  await expect(page.getByText('Enemy', { exact: true })).toBeVisible()
  await expect(page.getByTestId('stop')).toHaveAttribute('aria-disabled', 'true')
  await expect(page.getByTestId('attack')).toHaveAttribute('aria-disabled', 'true')
})

test('multiple selection shows every selected unit across three rows', async ({ page }) => {
  const catalog = await startMatch(page)
  await select(
    page,
    catalog.units.map((unit) => unit.id)
  )

  await expect(page.getByRole('list', { name: '16 selected units' }).getByRole('button')).toHaveCount(16)
  await expect(page.getByRole('button', { name: /Ally/ })).toHaveCount(8)
  await expect(page.getByRole('button', { name: /Enemy/ })).toHaveCount(8)
  await expect(page.getByTestId('selection-ownership-legend')).toBeVisible()
  await page.getByRole('button', { name: /Ally/ }).first().hover()
  await expect(page.getByText('Owner: P0', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Monk.*Ally/ }).hover()
  await expect(page.getByText(/Monk #/)).toBeVisible()
  await expect(page.getByLabel(/more selected units/)).toHaveCount(0)
  const context = await page.getByTestId('current-context-card').evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight
  }))
  expect(context.scrollWidth).toBeLessThanOrEqual(context.clientWidth)
  expect(context.scrollHeight).toBeLessThanOrEqual(context.clientHeight)
})
