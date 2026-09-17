import { expect, test } from '@playwright/test'
import { runDeterminismFixture } from '@rts/simulation/fixtures'
import { SEEDS } from '../fixtures/index.js'

// Spike A (§21.1): the same fixture must produce identical per-tick state
// hashes in Node and in Chromium. The simulation is fully portable.

const SEED_LIST = SEEDS.e2e.browserDeterminism
const TICKS = 400

test('simulation state hashes match between Node and Chromium', async ({ page }) => {
  await page.goto('/det.html')

  for (const seed of SEED_LIST) {
    const browserHashes = await page.evaluate(([s, t]) => window.__runDetFixture!(s, t), [seed, TICKS] as const)
    const nodeHashes = runDeterminismFixture(seed, TICKS)
    expect(browserHashes).toEqual(nodeHashes)
  }
})
