/** Pure comparison of two fixture runs, shared by the diagnostics UI. */
export interface DeterminismCheckResult {
  readonly passed: boolean
  readonly comparedTicks: number
  readonly mismatchTick: number | null
  readonly firstHash: string | null
  readonly lastHash: string | null
}

export function runDeterminismCheck(
  fixture: (seed: number, ticks: number) => string[],
  seed: number,
  ticks: number
): DeterminismCheckResult {
  const first = fixture(seed, ticks)
  const second = fixture(seed, ticks)
  const comparedTicks = Math.max(first.length, second.length)
  let mismatchTick: number | null = null
  for (let tick = 0; tick < comparedTicks; tick += 1) {
    if (first[tick] !== second[tick]) {
      mismatchTick = tick
      break
    }
  }
  return {
    passed: mismatchTick === null && first.length === second.length,
    comparedTicks,
    mismatchTick,
    firstHash: first[0] ?? null,
    lastHash: first.at(-1) ?? null
  }
}
