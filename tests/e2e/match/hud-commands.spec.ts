import { expect, type Page, test } from '@playwright/test'
import { settleUnits } from '../support/settle.js'

interface UnitInfo {
  readonly id: number
  readonly owner: number
  readonly x: number
  readonly y: number
}

async function canvasRect(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (canvas === null) {
      throw new Error('no canvas')
    }
    const r = canvas.getBoundingClientRect()
    return { left: r.left, top: r.top, width: r.width, height: r.height }
  })
}

async function worldToPage(page: Page, x: number, y: number) {
  const rect = await canvasRect(page)
  const screen = await page.evaluate(([wx, wy]) => window.__rtsDebug!.worldToScreen(wx, wy), [x, y] as const)
  return { x: rect.left + screen.x, y: rect.top + screen.y }
}

async function unitsByOwner(page: Page): Promise<UnitInfo[]> {
  return page.evaluate(() => {
    const owners = window.__rtsDebug?.getUnitOwners() ?? {}
    const positions = window.__rtsDebug?.getPositions() ?? {}
    return Object.entries(owners).map(([id, owner]) => ({
      id: Number(id),
      owner,
      x: positions[String(id)]!.x,
      y: positions[String(id)]!.y
    }))
  })
}

test('STOP cancels auto-orders and an armed ATTACK re-engages the target', async ({ page }) => {
  await page.goto('/?scenario=6v6&aggression=offensive')
  await settleUnits(page)
  const units = await unitsByOwner(page)
  const blueIds = units.filter((unit) => unit.owner === 0).map((unit) => unit.id)
  const redIds = units.filter((unit) => unit.owner === 1).map((unit) => unit.id)
  expect(blueIds.length).toBeGreaterThan(0)
  expect(redIds.length).toBeGreaterThan(0)

  // The squads cluster tightly once engaged, so select the blue units by id
  // through the debug hook (mouse clicks would hit overlapping neighbors).
  await page.evaluate((ids) => window.__rtsDebug!.setSelection(ids), blueIds)
  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getSelection() ?? []))
    .toEqual(expect.arrayContaining(blueIds))

  // STOP cancels their standing ATTACK orders. Let in-flight shots land, then
  // the red units' health is frozen (blue no longer damages them).
  await page.getByRole('button', { name: 'Stop' }).click()
  await page.waitForTimeout(600)
  const baselines = await page.evaluate((ids) => {
    return Object.fromEntries(ids.map((id) => [String(id), window.__rtsDebug?.getUnitHealth(id)?.current ?? 0]))
  }, redIds)

  // Arm ATTACK and right-click a red unit (whichever is topmost at the click
  // point): blue must engage it, so some red unit's health drops below the
  // frozen baseline.
  const target = units.find((unit) => unit.owner === 1)!
  await page.getByRole('button', { name: 'Attack', exact: true }).click()
  const targetNow = (await unitsByOwner(page)).find((unit) => unit.id === target.id) ?? target
  const targetScreen = await worldToPage(page, targetNow.x, targetNow.y)
  await page.mouse.click(targetScreen.x, targetScreen.y, { button: 'right' })

  await expect
    .poll(
      () =>
        page.evaluate(
          ([ids, base]) => {
            return ids.some((id) => {
              const health = window.__rtsDebug?.getUnitHealth(id)
              return health !== null && health !== undefined && health.current < base[String(id)]
            })
          },
          [redIds, baselines] as const
        ),
      { timeout: 15_000 }
    )
    .toBe(true)
})

test('left-clicking empty ground cancels an armed attack-move mode', async ({ page }) => {
  await page.goto('/?scenario=6v6&aggression=offensive')
  await settleUnits(page)
  const units = await unitsByOwner(page)
  const worker = units.find((unit) => unit.owner === 0)
  expect(worker).toBeDefined()
  await page.evaluate((id) => window.__rtsDebug!.setSelection([id]), worker!.id)

  const attackMove = page.getByRole('button', { name: 'Attack-move', exact: true })
  await attackMove.click()
  await expect(attackMove).toHaveAttribute('aria-pressed', 'true')

  const ground = await worldToPage(page, worker!.x + 800, worker!.y + 800)
  await page.mouse.click(ground.x, ground.y)

  await expect(attackMove).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByText('Pick a target: attack_move.')).toHaveCount(0)
})

test('SURRENDER ends the match with a defeat overlay', async ({ page }) => {
  await page.goto('/?scenario=6v6&aggression=offensive')
  await settleUnits(page)
  await page.getByRole('button', { name: 'Surrender' }).click()

  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('dialog').getByText('Defeat')).toBeVisible()
})
