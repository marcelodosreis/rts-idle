import { expect, type Page, test } from '@playwright/test'
import { settleUnits, waitForMatchReady, waitForStableCamera, waitForTicks } from '../support/settle.js'

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

async function boxSelect(page: Page, positions: readonly { readonly x: number; readonly y: number }[]): Promise<void> {
  const center = {
    x: positions.reduce((sum, position) => sum + position.x, 0) / positions.length,
    y: positions.reduce((sum, position) => sum + position.y, 0) / positions.length
  }
  await page.evaluate(({ x, y }) => window.__rtsDebug!.moveCamera(x, y), center)
  await waitForStableCamera(page, center.x, center.y)
  const points = await page.evaluate((worldPositions) => {
    const canvas = document.querySelector('canvas')
    if (canvas === null) {
      throw new Error('no canvas')
    }
    const rect = canvas.getBoundingClientRect()
    return worldPositions.map((position) => {
      const screen = window.__rtsDebug!.worldToScreen(position.x, position.y)
      return { x: rect.left + screen.x, y: rect.top + screen.y }
    })
  }, positions)
  await page.mouse.move(Math.min(...points.map(({ x }) => x)) - 12, Math.min(...points.map(({ y }) => y)) - 12)
  await page.mouse.down()
  await page.mouse.move(Math.max(...points.map(({ x }) => x)) + 12, Math.max(...points.map(({ y }) => y)) + 12)
  await page.mouse.up()
}

type ProjectileFeedbackKind = 'impact' | 'expiry'

async function rightClickUntilFeedback(
  page: Page,
  point: { readonly x: number; readonly y: number },
  kind: ProjectileFeedbackKind
): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.mouse.click(point.x, point.y, { button: 'right' })
    const seen = await expect
      .poll(
        () =>
          page.evaluate(
            (feedbackKind) =>
              window.__rtsDebug?.getProjectileFeedback().some((entry) => entry.type === feedbackKind) ?? false,
            kind
          ),
        { timeout: 4_000, intervals: [50] }
      )
      .toBe(true)
      .then(() => true)
      .catch(() => false)
    if (seen) {
      return
    }
  }
  throw new Error('no ' + kind + ' projectile feedback after retries')
}

test('player attack produces visible projectile lifecycle feedback', async ({ page }) => {
  test.setTimeout(45_000)
  await page.goto('/?scenario=projectiles&aggression=passive')
  await waitForMatchReady(page)
  await settleUnits(page)

  const units = await page.evaluate(() => {
    const owners = window.__rtsDebug?.getUnitOwners() ?? {}
    const kinds = window.__rtsDebug?.getUnitKinds() ?? {}
    const positions = window.__rtsDebug?.getPositions() ?? {}
    return Object.entries(owners).map(([id, owner]) => ({
      id: Number(id),
      owner,
      kind: kinds[id],
      position: positions[id]
    }))
  })
  const attacker = units.find((unit) => unit.owner === 0 && unit.kind === 'archer')
  const instantAttacker = units.find((unit) => unit.owner === 0 && unit.kind === 'warrior')
  const target = units.find((unit) => unit.owner === 1 && unit.kind === 'lancer')
  const expiryTarget = units.find((unit) => unit.owner === 1 && unit.kind === 'warrior')
  expect(attacker?.position).toBeDefined()
  expect(instantAttacker?.position).toBeDefined()
  expect(target?.position).toBeDefined()
  expect(expiryTarget?.position).toBeDefined()

  const attackerPoint = await worldPoint(page, attacker!.position!)
  await page.mouse.click(attackerPoint.x, attackerPoint.y)
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getSelection() ?? [])).toEqual([attacker!.id])
  const targetHealth = await page.evaluate((id) => window.__rtsDebug?.getUnitHealth(id)?.current ?? null, target!.id)
  const targetPoint = await worldPoint(page, target!.position!)
  await rightClickUntilFeedback(page, targetPoint, 'impact')
  await expect
    .poll(() => page.evaluate((id) => window.__rtsDebug?.getUnitHealth(id)?.current ?? null, target!.id))
    .toBeLessThan(targetHealth ?? 0)
  await page.getByRole('button', { name: 'Stop' }).click()

  await boxSelect(page, [attacker!.position!, instantAttacker!.position!])
  await expect
    .poll(() => page.evaluate(() => [...(window.__rtsDebug?.getSelection() ?? [])].sort((left, right) => left - right)))
    .toEqual([attacker!.id, instantAttacker!.id].sort((left, right) => left - right))
  await waitForTicks(page, 22)
  const expiryPoint = await worldPoint(page, expiryTarget!.position!)
  await rightClickUntilFeedback(page, expiryPoint, 'expiry')
})
