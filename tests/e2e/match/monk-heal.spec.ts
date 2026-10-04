import { expect, type Page, test } from '@playwright/test'
import { expectAnim, hasArt } from '../support/art.js'
import { waitForMatchReady, waitForStableCamera } from '../support/settle.js'

async function screenPoint(page: Page, id: number) {
  return page.evaluate((unitId) => {
    const canvas = document.querySelector('canvas')
    if (canvas === null) {
      throw new Error('no canvas')
    }
    const position = window.__rtsDebug!.getPositions()[String(unitId)]
    if (position === undefined) {
      throw new Error(`unit ${unitId} has no position`)
    }
    const rect = canvas.getBoundingClientRect()
    const point = window.__rtsDebug!.worldToScreen(position.x, position.y)
    return { x: rect.left + point.x, y: rect.top + point.y }
  }, id)
}

async function focusUnit(page: Page, id: number): Promise<void> {
  const position = await page.evaluate((unitId) => window.__rtsDebug!.getPositions()[String(unitId)]!, id)
  await page.evaluate(({ x, y }) => window.__rtsDebug?.moveCamera(x, y), position)
  await waitForStableCamera(page, position.x, position.y)
}

async function findHealingPair(page: Page): Promise<{ readonly monkId: number; readonly warriorId: number }> {
  const pair = await page.evaluate(() => {
    const owners = window.__rtsDebug?.getUnitOwners() ?? {}
    const kinds = window.__rtsDebug?.getUnitKinds() ?? {}
    for (const [id, owner] of Object.entries(owners)) {
      if (owner !== 0 || kinds[id] !== 'warrior') {
        continue
      }
      const health = window.__rtsDebug?.getUnitHealth(Number(id))
      if (health !== null && health !== undefined && health.current < health.max) {
        const monkId = Object.entries(owners).find(
          ([candidateId, monkOwner]) => monkOwner === 0 && kinds[candidateId] === 'monk'
        )?.[0]
        if (monkId !== undefined) {
          return { monkId: Number(monkId), warriorId: Number(id) }
        }
      }
    }
    return null
  })
  if (pair === null) {
    throw new Error('regression fixture has no Monk and damaged allied Warrior')
  }
  return pair
}

test('Monk heals an allied unit with a right-click while left-click selects', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/?scenario=regression&aggression=passive')
  await waitForMatchReady(page)

  const { monkId, warriorId } = await findHealingPair(page)
  await focusUnit(page, monkId)
  const monkPoint = await screenPoint(page, monkId)
  const warriorPoint = await screenPoint(page, warriorId)
  await page.mouse.click(monkPoint.x, monkPoint.y)
  await expect(page.getByRole('button', { name: /Monk/ })).toBeVisible()
  const healButton = page.getByRole('button', { name: /^Heal/ })
  await expect(healButton).toBeEnabled()

  // A primary (left) click selects the ally instead of healing it.
  await page.mouse.click(warriorPoint.x, warriorPoint.y)
  await expect(page.getByRole('button', { name: /Soldier|Warrior/ })).toBeVisible()
  await expect.poll(() => page.evaluate((id) => window.__rtsDebug?.getUnitHealth(id)?.current ?? 0, warriorId)).toBe(90)

  // A secondary (right) click on the damaged ally heals it.
  await page.mouse.click(monkPoint.x, monkPoint.y)
  await expect(page.getByRole('button', { name: /Monk/ })).toBeVisible()
  await page.mouse.click(warriorPoint.x, warriorPoint.y, { button: 'right' })

  await expect
    .poll(() => page.evaluate((id) => window.__rtsDebug?.getUnitHealth(id)?.current ?? 0, warriorId), {
      timeout: 15_000
    })
    .toBe(115)
  if (await hasArt(page)) {
    await expect.poll(() => expectAnim(page, monkId)).not.toBeNull()
  }
  await expect(healButton).toBeDisabled()
  await expect(healButton).toHaveAttribute('aria-disabled', 'true')
  await healButton.hover()
  await expect(page.getByText(/Heal ready in/)).toBeVisible()
})
