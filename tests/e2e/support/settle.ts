import { expect, type Page } from '@playwright/test'

/**
 * Loads the match and waits until every unit's position stops changing across
 * a poll interval. The hostile demo marches its squads toward each other and
 * fights in place once they meet, so the settled snapshot is the stable window
 * in which click/box interactions are reliable.
 */
export async function settleUnits(page: Page): Promise<Record<string, { readonly x: number; readonly y: number }>> {
  if (page.url() === 'about:blank') {
    await page.goto('/')
  }
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1)).toBeGreaterThan(0)
  let previous = await page.evaluate(() => window.__rtsDebug?.getPositions() ?? {})
  expect(Object.keys(previous).length).toBeGreaterThan(0)
  // Require ~0.5s of uninterrupted stability at a fast fixed poll interval:
  // expect.poll defaults to exponential backoff (up to 1s/poll), which would
  // let the squads kill each other before the wait completes. A stable window
  // that short also skips the initial spawn pause before the squads march.
  let stablePolls = 0
  await expect
    .poll(
      async () => {
        const current = await page.evaluate(() => window.__rtsDebug?.getPositions() ?? {})
        const same =
          Object.keys(current).length === Object.keys(previous).length &&
          Object.entries(previous).every(
            ([id, point]) => current[String(id)]?.x === point.x && current[String(id)]?.y === point.y
          )
        previous = current
        stablePolls = same ? stablePolls + 1 : 0
        return stablePolls >= 5
      },
      { timeout: 20_000, intervals: [100] }
    )
    .toBe(true)
  return previous
}

/**
 * Selects the given units by id through the renderer (mirrors a box-select).
 * Needed because the demo squads cluster tightly once engaged, so a mouse click
 * can land on a neighbor — ownership-specific selections must be explicit.
 */
export async function selectByIds(page: Page, ids: readonly number[]): Promise<void> {
  await page.evaluate((selection) => window.__rtsDebug!.setSelection(selection), ids)
}

/** Selects the first unit owned by `owner` and returns its id. */
export async function selectFirstByOwner(page: Page, owner: number): Promise<number> {
  const ids = await page.evaluate((targetOwner) => {
    const owners = window.__rtsDebug?.getUnitOwners() ?? {}
    return Object.entries(owners)
      .filter(([, current]) => current === targetOwner)
      .map(([id]) => Number(id))
  }, owner)
  expect(ids.length).toBeGreaterThan(0)
  await selectByIds(page, [ids[0]!])
  return ids[0]!
}
