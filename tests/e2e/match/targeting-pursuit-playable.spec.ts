import { expect, type Page, test } from '@playwright/test'
import { selectByIds, waitForMatchReady, waitForStableCamera } from '../support/settle.js'

async function worldPoint(page: Page, id: number, position: { readonly x: number; readonly y: number }) {
  await page.evaluate(({ x, y }) => window.__rtsDebug!.moveCamera(x, y), position)
  await waitForStableCamera(page, position.x, position.y)
  const current = await page.evaluate((unitId) => window.__rtsDebug!.getPositions()[String(unitId)], id)
  if (current === undefined) {
    throw new Error(`target ${id} is no longer visible`)
  }
  return page.evaluate((point) => {
    const canvas = document.querySelector('canvas')
    if (canvas === null) {
      throw new Error('no canvas')
    }
    const rect = canvas.getBoundingClientRect()
    const screen = window.__rtsDebug!.worldToScreen(point.x, point.y)
    return { x: rect.left + screen.x, y: rect.top + screen.y }
  }, current)
}

test('a visible attack pursues only the last known position after the target hides', async ({ page }) => {
  test.setTimeout(45_000)
  await page.goto('/?scenario=targeting&aggression=offensive')
  await waitForMatchReady(page)

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
  const target = units.find((unit) => unit.owner === 1 && unit.kind === 'lancer')
  expect(attacker).toBeDefined()
  expect(target).toBeDefined()
  expect(target?.position).toBeDefined()

  await selectByIds(page, [attacker!.id])
  const targetPoint = await worldPoint(page, target!.id, target!.position!)
  await page.mouse.click(targetPoint.x, targetPoint.y, { button: 'right' })

  await expect(page.getByTestId('current-context-card')).toContainText('Alvo perdido', { timeout: 20_000 })
  await expect
    .poll(() =>
      page.evaluate((id) => Object.keys(window.__rtsDebug?.getUnitOwners() ?? {}).includes(String(id)), target!.id)
    )
    .toBe(false)
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getSelection() ?? [])).toContain(attacker!.id)
})
