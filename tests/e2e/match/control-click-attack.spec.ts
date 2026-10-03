import { expect, type Page, test } from '@playwright/test'
import { selectByIds, settleUnits, waitForStableRead } from '../support/settle.js'

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

test('right-clicking an enemy attacks it and preserves the selection', async ({ page }) => {
  await page.goto('/?scenario=regression&aggression=passive')
  await settleUnits(page)
  const units = await unitsByOwner(page)
  const blueIds = await page.evaluate(() => {
    const owners = window.__rtsDebug?.getUnitOwners() ?? {}
    const kinds = window.__rtsDebug?.getUnitKinds() ?? {}
    return Object.entries(owners)
      .filter(([id, owner]) => owner === 0 && kinds[id] !== 'monk' && kinds[id] !== 'pawn')
      .map(([id]) => Number(id))
      .slice(0, 6)
  })
  const red = units.find((unit) => unit.owner === 1)
  expect(blueIds.length).toBeGreaterThan(0)
  expect(red).toBeDefined()

  await selectByIds(page, blueIds)

  // Keep the selected units idle so the only damage afterwards is the one we
  // issue. Wait for the health read to settle instead of sleeping for shots.
  await page.getByRole('button', { name: 'Stop' }).click()
  const baseline = await waitForStableRead(() =>
    page.evaluate((id) => window.__rtsDebug?.getUnitHealth(id)?.current ?? 0, red!.id)
  )

  const target = (await unitsByOwner(page)).find((unit) => unit.id === red!.id) ?? red!
  await page.evaluate(({ x, y }) => window.__rtsDebug?.moveCamera(x, y), target)
  const targetScreen = await worldToPage(page, target.x, target.y)
  await page.mouse.click(targetScreen.x, targetScreen.y, { button: 'right' })

  await expect
    .poll(() => page.evaluate((id) => window.__rtsDebug?.getUnitHealth(id)?.current ?? 0, red!.id), {
      timeout: 45_000
    })
    .toBeLessThan(baseline)

  const selection = await page.evaluate(() => window.__rtsDebug?.getSelection() ?? [])
  expect(selection).toEqual(expect.arrayContaining(blueIds))
  expect(selection).not.toContain(red!.id)
})

test('Control+click on an enemy does not change the selection', async ({ page }) => {
  await page.goto('/?scenario=regression&aggression=offensive')
  await settleUnits(page)
  const units = await unitsByOwner(page)
  const blueIds = await page.evaluate(() => {
    const owners = window.__rtsDebug?.getUnitOwners() ?? {}
    const kinds = window.__rtsDebug?.getUnitKinds() ?? {}
    return Object.entries(owners)
      .filter(([id, owner]) => owner === 0 && kinds[id] !== 'monk' && kinds[id] !== 'pawn')
      .map(([id]) => Number(id))
      .slice(0, 6)
  })
  const red = units.find((unit) => unit.owner === 1)
  expect(blueIds.length).toBeGreaterThan(0)
  expect(red).toBeDefined()

  await selectByIds(page, blueIds)
  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getSelection() ?? []))
    .toEqual(expect.arrayContaining(blueIds))

  const target = (await unitsByOwner(page)).find((unit) => unit.id === red!.id) ?? red!
  await page.evaluate(({ x, y }) => window.__rtsDebug?.moveCamera(x, y), target)
  const targetScreen = await worldToPage(page, target.x, target.y)

  await page.keyboard.down('Control')
  await page.mouse.click(targetScreen.x, targetScreen.y)
  await page.keyboard.up('Control')

  const selection = await page.evaluate(() => window.__rtsDebug?.getSelection() ?? [])
  expect(selection).toEqual(expect.arrayContaining(blueIds))
  expect(selection).not.toContain(red!.id)
})
