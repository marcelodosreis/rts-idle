import { expect, test } from '@playwright/test'
import { runDeterminismFixture } from '@rts/simulation/fixtures'
import { SEEDS } from '../../fixtures/index.js'

// Spike A (§21.1): the same fixture must produce identical per-tick state
// hashes in Node and in Chromium. The simulation is fully portable.

const SEED_LIST = SEEDS.e2e.browserDeterminism
const TICKS = 400

function mismatchSummary(expected: readonly string[], actual: readonly string[]): string {
  const mismatches = []
  const comparedTicks = Math.max(expected.length, actual.length)

  for (let tick = 0; tick < comparedTicks; tick += 1) {
    if (expected[tick] !== actual[tick]) {
      mismatches.push(tick)
    }
  }

  const firstTick = mismatches[0]
  const lastTick = mismatches[mismatches.length - 1]
  return [
    `Determinism mismatch: ${mismatches.length}/${comparedTicks} ticks`,
    `first=${firstTick ?? 'none'}`,
    `last=${lastTick ?? 'none'}`,
    `expectedFirst=${firstTick === undefined ? 'none' : (expected[firstTick] ?? 'missing')}`,
    `actualFirst=${firstTick === undefined ? 'none' : (actual[firstTick] ?? 'missing')}`,
    `expectedLast=${lastTick === undefined ? 'none' : (expected[lastTick] ?? 'missing')}`,
    `actualLast=${lastTick === undefined ? 'none' : (actual[lastTick] ?? 'missing')}`
  ].join(' ')
}

test('simulation state hashes match between Node and Chromium', async ({ page }) => {
  await page.goto('/laboratory/diagnostics')
  await page.waitForFunction(() => typeof window.__runDetFixture === 'function')

  for (const seed of SEED_LIST) {
    const browserHashes = await page.evaluate(([s, t]) => window.__runDetFixture!(s, t), [seed, TICKS] as const)
    const nodeHashes = runDeterminismFixture(seed, TICKS)
    const hashesMatch =
      browserHashes.length === nodeHashes.length && browserHashes.every((hash, tick) => hash === nodeHashes[tick])
    if (!hashesMatch) {
      throw new Error(mismatchSummary(nodeHashes, browserHashes))
    }
  }
})

test('determinism page runs a browser consistency check and displays hashes', async ({ page }) => {
  await page.goto('/laboratory/diagnostics')
  await page.waitForFunction(() => typeof window.__runDetFixture === 'function')

  await page.getByLabel('Seed').fill('7')
  await page.getByLabel('Ticks').fill('12')
  await page.getByRole('button', { name: 'Run Determinism Check' }).click()

  const result = page.getByTestId('determinism-result')
  await expect(result).toContainText('Passed')
  await expect(result).toContainText('12 ticks produced identical hashes')
  await expect(result).toContainText('First hash')
  await expect(result).toContainText('Last hash')
})
