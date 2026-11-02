import { expect, type Page, test } from '@playwright/test'
import { tilesToFixed } from '@rts/shared'
import { settleUnits, waitForMatchReady, waitForStableCamera } from '../support/settle.js'

const APPROACH = { x: 19.5, y: 15.5 }
const TARGET_TILE = { x: 19, y: 17 }
const PURSUIT = { x: 20, y: 18 }

type Point = { readonly x: number; readonly y: number }

async function worldPoint(page: Page, position: Point) {
  await page.evaluate(({ x, y }) => window.__rtsDebug!.moveCamera(x, y), position)
  await waitForStableCamera(page, position.x, position.y)
  return page.evaluate((point) => {
    const canvas = document.querySelector('canvas')
    if (canvas === null) {
      throw new Error('no canvas')
    }
    const rect = canvas.getBoundingClientRect()
    const screen = window.__rtsDebug!.worldToScreen(point.x, point.y)
    return { x: rect.left + screen.x, y: rect.top + screen.y }
  }, position)
}

async function positions(page: Page) {
  return page.evaluate(() => window.__rtsDebug?.getPositions() ?? {})
}

async function owners(page: Page) {
  return page.evaluate(() => window.__rtsDebug?.getUnitOwners() ?? {})
}

async function kinds(page: Page) {
  return page.evaluate(() => window.__rtsDebug?.getUnitKinds() ?? {})
}

function fixed(tilePoint: Point): Point {
  return { x: tilesToFixed(tilePoint.x), y: tilesToFixed(tilePoint.y) }
}

async function boxSelect(page: Page, points: readonly Point[]): Promise<void> {
  const center = {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length
  }
  await page.evaluate(({ x, y }) => window.__rtsDebug!.moveCamera(x, y), center)
  await waitForStableCamera(page, center.x, center.y)
  const screen = await page.evaluate((worldPoints) => {
    const canvas = document.querySelector('canvas')
    if (canvas === null) {
      throw new Error('no canvas')
    }
    const rect = canvas.getBoundingClientRect()
    return worldPoints.map((point) => {
      const mapped = window.__rtsDebug!.worldToScreen(point.x, point.y)
      return { x: rect.left + mapped.x, y: rect.top + mapped.y }
    })
  }, points)
  await page.mouse.move(
    Math.min(...screen.map((point) => point.x)) - 16,
    Math.min(...screen.map((point) => point.y)) - 16
  )
  await page.mouse.down()
  await page.mouse.move(
    Math.max(...screen.map((point) => point.x)) + 16,
    Math.max(...screen.map((point) => point.y)) + 16
  )
  await page.mouse.up()
}

async function unitAtTile(page: Page, tilePoint: Point): Promise<number | null> {
  const units = await positions(page)
  const unitOwners = await owners(page)
  const tolerance = 40
  for (const [id, owner] of Object.entries(unitOwners)) {
    if (owner !== 1) {
      continue
    }
    const position = units[id]
    if (
      position !== undefined &&
      Math.abs(position.x - tilesToFixed(tilePoint.x)) <= tolerance &&
      Math.abs(position.y - tilesToFixed(tilePoint.y)) <= tolerance
    ) {
      return Number(id)
    }
  }
  return null
}

async function health(page: Page, id: number): Promise<number | null> {
  return page.evaluate((unitId) => window.__rtsDebug?.getUnitHealth(unitId)?.current ?? null, id)
}

test('regression army advances through the chokepoint, blasts, pursues, and resolves the engagement', async ({
  page
}) => {
  test.setTimeout(150_000)
  await page.goto('/?scenario=regression&aggression=passive')
  await waitForMatchReady(page)
  await settleUnits(page)

  const unitOwners = await owners(page)
  const unitKinds = await kinds(page)
  const initialPositions = await positions(page)
  const army = Object.entries(unitOwners)
    .filter(([id, owner]) => owner === 0 && ['warrior', 'archer', 'monk', 'lancer'].includes(unitKinds[id] ?? ''))
    .map(([id]) => ({ id: Number(id), position: initialPositions[id]! }))
  expect(army).toHaveLength(4)
  const archer = army.find((unit) => unitKinds[String(unit.id)] === 'archer')
  expect(archer).toBeDefined()

  await boxSelect(
    page,
    army.map((unit) => unit.position)
  )
  await expect
    .poll(() => page.evaluate(() => [...(window.__rtsDebug?.getSelection() ?? [])].sort((a, b) => a - b)))
    .toEqual(army.map((unit) => unit.id).sort((a, b) => a - b))

  const approach = fixed(APPROACH)
  const approachPoint = await worldPoint(page, approach)
  await page.mouse.click(approachPoint.x, approachPoint.y, { button: 'right' })
  await expect
    .poll(
      async () => {
        const current = (await positions(page))[String(archer!.id)]
        if (current === undefined) {
          return Number.POSITIVE_INFINITY
        }
        return Math.max(Math.abs(current.x - approach.x), Math.abs(current.y - approach.y))
      },
      { timeout: 45_000 }
    )
    .toBeLessThanOrEqual(tilesToFixed(2))

  await page.evaluate((id) => window.__rtsDebug!.setSelection([id]), archer!.id)
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getSelection() ?? [])).toEqual([archer!.id])

  const gold = page.getByTestId('hud-resource-gold')
  await expect(gold).toContainText('600')
  const blast = page.getByRole('button', { name: 'Blast' })
  await blast.click()
  await expect(blast).toHaveAttribute('aria-pressed', 'true')

  const targetId = await unitAtTile(page, TARGET_TILE)
  expect(targetId).not.toBeNull()
  const targetHealth = await health(page, targetId!)
  const targetPoint = await worldPoint(page, fixed(TARGET_TILE))
  await page.mouse.click(targetPoint.x, targetPoint.y, { button: 'right' })
  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getProjectileFeedback().some((entry) => entry.type === 'area')))
    .toBe(true)
  await expect(gold).toContainText('575')
  await expect.poll(() => health(page, targetId!)).toBe((targetHealth ?? 0) - 16)

  const currentPositions = await positions(page)
  const attackers = army
    .filter((unit) => unitKinds[String(unit.id)] !== 'monk')
    .map((unit) => currentPositions[String(unit.id)]!)
    .filter((position) => position !== undefined)
  expect(attackers.length).toBe(3)
  await page.evaluate(
    (ids) => window.__rtsDebug!.setSelection(ids),
    army.filter((unit) => unitKinds[String(unit.id)] !== 'monk').map((unit) => unit.id)
  )
  const attackMove = page.getByRole('button', { name: 'Attack Move' })
  await attackMove.click()
  const pursuitPoint = await worldPoint(page, fixed(PURSUIT))
  await page.mouse.click(pursuitPoint.x, pursuitPoint.y, { button: 'right' })

  await expect
    .poll(
      async () => {
        const remaining = await health(page, targetId!)
        const ownersNow = await owners(page)
        const enemies = Object.values(ownersNow).filter((owner) => owner === 1).length
        return remaining === null || enemies < 8 || remaining < (targetHealth ?? 0) - 16
      },
      { timeout: 45_000 }
    )
    .toBe(true)

  await page.evaluate((id) => window.__rtsDebug!.setSelection([id]), archer!.id)
  await expect(blast).toBeVisible()
  await blast.hover()
  await expect(page.getByText('Blast ready in')).toBeVisible()
})
