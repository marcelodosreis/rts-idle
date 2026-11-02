import { expect, type Page, test } from '@playwright/test'
import { tilesToFixed } from '@rts/shared'
import { settleUnits, waitForMatchReady, waitForStableCamera } from '../support/settle.js'

const APPROACH_TILE = { x: 18.25, y: 16.5 }
const TARGET_TILE = { x: 19, y: 17 }
const OUT_OF_RANGE_TILE = { x: 21, y: 18 }

async function worldPoint(page: Page, position: { readonly x: number; readonly y: number }) {
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

async function unitAtTile(page: Page, tileX: number, tileY: number) {
  return page.evaluate(
    ([x, y]) => {
      const owners = window.__rtsDebug?.getUnitOwners() ?? {}
      const kinds = window.__rtsDebug?.getUnitKinds() ?? {}
      const positions = window.__rtsDebug?.getPositions() ?? {}
      const tolerance = 32
      for (const [id, owner] of Object.entries(owners)) {
        if (owner !== 1) {
          continue
        }
        const position = positions[id]
        if (position !== undefined && Math.abs(position.x - x) <= tolerance && Math.abs(position.y - y) <= tolerance) {
          return { id: Number(id), kind: kinds[id] ?? null }
        }
      }
      return null
    },
    [tilesToFixed(tileX), tilesToFixed(tileY)] as const
  )
}

async function playerArcher(page: Page) {
  return page.evaluate(() => {
    const owners = window.__rtsDebug?.getUnitOwners() ?? {}
    const kinds = window.__rtsDebug?.getUnitKinds() ?? {}
    const positions = window.__rtsDebug?.getPositions() ?? {}
    for (const [id, owner] of Object.entries(owners)) {
      if (owner === 0 && kinds[id] === 'archer') {
        return { id: Number(id), position: positions[id] ?? null }
      }
    }
    return null
  })
}

async function health(page: Page, id: number): Promise<number | null> {
  return page.evaluate((unitId) => window.__rtsDebug?.getUnitHealth(unitId)?.current ?? null, id)
}

test('regression archer casts Explosive Shot with radius, cost, cooldown, and rejection feedback', async ({ page }) => {
  test.setTimeout(75_000)
  await page.goto('/?scenario=regression&aggression=passive')
  await waitForMatchReady(page)
  await settleUnits(page)

  const archer = await playerArcher(page)
  expect(archer).not.toBeNull()
  const archerPoint = await worldPoint(page, archer!.position!)
  await page.mouse.click(archerPoint.x, archerPoint.y)
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getSelection() ?? [])).toEqual([archer!.id])

  const gold = page.getByTestId('hud-resource-gold')
  await expect(gold).toContainText('600')

  const approach = {
    x: tilesToFixed(APPROACH_TILE.x),
    y: tilesToFixed(APPROACH_TILE.y)
  }
  const approachPoint = await worldPoint(page, approach)
  await page.mouse.click(approachPoint.x, approachPoint.y, { button: 'right' })
  await expect
    .poll(
      async () => {
        const position = await page.evaluate((id) => window.__rtsDebug?.getPositions()[String(id)] ?? null, archer!.id)
        if (position === null) {
          return Number.POSITIVE_INFINITY
        }
        return Math.max(Math.abs(position.x - approach.x), Math.abs(position.y - approach.y))
      },
      { timeout: 30_000 }
    )
    .toBeLessThanOrEqual(tilesToFixed(0.25))

  const target = await unitAtTile(page, TARGET_TILE.x, TARGET_TILE.y)
  const outOfRange = await unitAtTile(page, OUT_OF_RANGE_TILE.x, OUT_OF_RANGE_TILE.y)
  const adjacent = await unitAtTile(page, TARGET_TILE.x - 1, TARGET_TILE.y)
  const justOutside = await unitAtTile(page, 21, 18)
  expect(target).not.toBeNull()
  expect(outOfRange).not.toBeNull()
  expect(adjacent).not.toBeNull()
  expect(justOutside).not.toBeNull()

  const targetHealth = await health(page, target!.id)
  const adjacentHealth = await health(page, adjacent!.id)
  const justOutsideHealth = await health(page, justOutside!.id)

  const explosiveShot = page.getByRole('button', { name: 'Blast' })
  const feedback = page.getByTestId('hud-context-feedback')

  await explosiveShot.click()
  await expect(explosiveShot).toHaveAttribute('aria-pressed', 'true')
  const outOfRangePoint = await worldPoint(page, {
    x: tilesToFixed(OUT_OF_RANGE_TILE.x),
    y: tilesToFixed(OUT_OF_RANGE_TILE.y)
  })
  await page.mouse.click(outOfRangePoint.x, outOfRangePoint.y, { button: 'right' })
  await expect(feedback).toContainText('out of range')
  await expect(gold).toContainText('600')

  await explosiveShot.click()
  const targetPoint = await worldPoint(page, {
    x: tilesToFixed(TARGET_TILE.x),
    y: tilesToFixed(TARGET_TILE.y)
  })
  await page.mouse.click(targetPoint.x, targetPoint.y, { button: 'right' })

  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getProjectileFeedback().some((entry) => entry.type === 'area')))
    .toBe(true)
  await expect(gold).toContainText('575')
  await expect
    .poll(() => page.evaluate((id) => window.__rtsDebug?.getExplosiveShotCooldown(id) ?? null, archer!.id))
    .toBeGreaterThan(0)
  await expect.poll(() => health(page, target!.id)).toBe((targetHealth ?? 0) - 16)
  await expect.poll(() => health(page, adjacent!.id)).toBe((adjacentHealth ?? 0) - 8)
  await expect.poll(() => health(page, justOutside!.id)).toBe(justOutsideHealth)

  await expect(explosiveShot).toHaveAttribute('aria-disabled', 'true')
  await explosiveShot.hover()
  await expect(page.getByText('Blast ready in')).toBeVisible()
})
