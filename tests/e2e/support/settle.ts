import { expect, type Page } from '@playwright/test'
import { tilesToFixed } from '@rts/shared'

export async function waitForMatchReady(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            window.__rtsDebug?.getReadyState() ?? {
              configReceived: false,
              snapshotReceived: false,
              rendererReady: false,
              firstFramePresented: false,
              rendererError: null,
              tick: -1,
              ready: false
            }
        ),
      { timeout: 15_000 }
    )
    .toMatchObject({ ready: true })
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1)).toBeGreaterThan(0)
}

/**
 * Reads a value repeatedly until two consecutive reads are equal, then returns
 * the stable value. Replaces "sleep while something settles" patterns with an
 * observation of the settled state.
 */
export async function waitForStableRead<T>(read: () => Promise<T>, timeout = 10_000): Promise<T> {
  let previous = await read()
  await expect
    .poll(
      async () => {
        const current = await read()
        const same = JSON.stringify(current) === JSON.stringify(previous)
        previous = current
        return same
      },
      { timeout, intervals: [100] }
    )
    .toBe(true)
  return previous
}

/**
 * Waits until the world→screen mapping of a point stops changing after a camera
 * move. Replaces requestAnimationFrame guessing with an observable-settled wait.
 */
export async function waitForStableCamera(page: Page, x: number, y: number, timeout = 5_000): Promise<void> {
  await waitForStableRead(
    () =>
      page.evaluate(([fixedX, fixedY]) => window.__rtsDebug?.worldToScreen(fixedX, fixedY) ?? null, [x, y] as const),
    timeout
  )
}

/** Reads the authoritative tick; the only time source E2E assertions may use. */
export async function currentTick(page: Page): Promise<number> {
  return page.evaluate(() => window.__rtsDebug?.getTick() ?? -1)
}

/**
 * Waits until the simulation advances by `ticks` from the current tick. This
 * replaces wall-clock sleeps: gameplay progress is measured in ticks, so tests
 * observe the same amount of simulation regardless of runner speed.
 */
export async function waitForTicks(page: Page, ticks: number, timeout = 30_000): Promise<number> {
  const start = await currentTick(page)
  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1), {
      timeout,
      intervals: [50, 100]
    })
    .toBeGreaterThanOrEqual(start + ticks)
  return currentTick(page)
}

/**
 * Loads the match and waits until every unit's position stops changing across
 * a poll interval. The hostile demo marches its squads toward each other and
 * fights in place once they meet, so the settled snapshot is the stable window
 * in which click/box interactions are reliable.
 */
export async function settleUnits(page: Page): Promise<Record<string, { readonly x: number; readonly y: number }>> {
  if (page.url() === 'about:blank') {
    await page.goto('/?scenario=regression&aggression=passive')
  }
  await waitForMatchReady(page)
  let previous = await page.evaluate(() => window.__rtsDebug?.getPositions() ?? {})
  expect(Object.keys(previous).length).toBeGreaterThan(0)
  // Positions are interpolated render pixels, so exact equality can be defeated
  // by sub-pixel easing even when the simulation is at rest. Compare with a
  // small epsilon and require a short stable window at a fast fixed interval:
  // expect.poll defaults to exponential backoff (up to 1s/poll), which would
  // let the squads kill each other before the wait completes.
  const POSITION_EPSILON = 0.75
  let stablePolls = 0
  await expect
    .poll(
      async () => {
        const current = await page.evaluate(() => window.__rtsDebug?.getPositions() ?? {})
        const same =
          Object.keys(current).length === Object.keys(previous).length &&
          Object.entries(previous).every(([id, point]) => {
            const next = current[String(id)]
            return (
              next !== undefined &&
              Math.abs(next.x - point.x) <= POSITION_EPSILON &&
              Math.abs(next.y - point.y) <= POSITION_EPSILON
            )
          })
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

export async function revealEnemyUnits(page: Page): Promise<void> {
  const unitId = await selectFirstByOwner(page, 0)
  const target = { x: tilesToFixed(20) + 128, y: tilesToFixed(16) + 128 }
  await page.evaluate(([x, y]) => window.__rtsDebug!.moveCamera(x, y), [target.x, target.y] as const)
  await waitForStableCamera(page, target.x, target.y)
  const point = await page.evaluate(
    ([x, y]) => {
      const canvas = document.querySelector('canvas')
      if (canvas === null) {
        throw new Error('no canvas')
      }
      const rect = canvas.getBoundingClientRect()
      const screen = window.__rtsDebug!.worldToScreen(x, y)
      return { x: rect.left + screen.x, y: rect.top + screen.y }
    },
    [target.x, target.y] as const
  )
  await page.mouse.click(point.x, point.y, { button: 'right' })
  await expect
    .poll(
      () =>
        page.evaluate(
          ([id, targetX, targetY]) => {
            const position = window.__rtsDebug?.getPositions()[String(id)]
            return position === undefined
              ? Number.POSITIVE_INFINITY
              : Math.max(Math.abs(position.x - targetX), Math.abs(position.y - targetY))
          },
          [unitId, target.x, target.y] as const
        ),
      { timeout: 15_000, intervals: [100, 250] }
    )
    .toBeLessThan(12)
  await expect
    .poll(() => page.evaluate(() => Object.values(window.__rtsDebug?.getUnitOwners() ?? {}).includes(1)))
    .toBe(true)
  await expect
    .poll(() => page.evaluate((id) => window.__rtsDebug?.getSelection().includes(id) ?? false, unitId))
    .toBe(true)
}
