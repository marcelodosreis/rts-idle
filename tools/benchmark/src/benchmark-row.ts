import {
  createRulesIdentity,
  createSimulation,
  MAX_UNITS_PER_COMMAND,
  type RulesIdentity,
  type ScheduledCommand
} from '@rts/simulation'
import { average, percentile } from './benchmark-stats.js'
import { measureAverageMs, measureStepTiming } from './benchmark-timing.js'
import { buildBenchmarkWorld } from './benchmark-world.js'

const BENCH_IDENTITY: RulesIdentity = createRulesIdentity('bench')

/** Fixed-unit move target used by every benchmark step. */
const MOVE_TARGET = 50000

/** Warm-up steps before measurement so JIT/caches settle (methodology §21.5). */
const WARMUP_STEPS = 10

/** Samples per hash/serialize timing estimate. */
const TIMING_SAMPLES = 20

export interface BenchmarkRow {
  readonly entityCount: number
  readonly steps: number
  readonly avgMs: number
  readonly p50Ms: number
  readonly p95Ms: number
  readonly p99Ms: number
  readonly maxMs: number
  readonly ticksPerSecond: number
  readonly heapDeltaMiB: number
  readonly hashMs: number
  readonly serializeMs: number
  readonly cpuPercentAt20: number
  readonly cpuPercentAt30: number
  readonly cpuPercentAt60: number
}

/**
 * Measures a single benchmark row: world + simulation setup, warm-up, per-step
 * timing with heap delta, and hash/serialize costs. Step and timing concerns
 * live in `benchmark-timing.ts`; this function assembles the report row.
 */
export function measureBenchmarkRow(entityCount: number, steps: number, seed: number): BenchmarkRow {
  const world = buildBenchmarkWorld(entityCount)
  const sim = createSimulation({ seed, identity: BENCH_IDENTITY, initialWorld: world })
  const moveIds = world.aliveIds().slice(0, MAX_UNITS_PER_COMMAND)

  for (let i = 0; i < WARMUP_STEPS; i += 1) {
    sim.step()
  }

  const command = (tick: number): ScheduledCommand => ({
    tick,
    playerId: 0,
    sequence: tick,
    intent: { type: 'MOVE', payload: { unitIds: moveIds, x: MOVE_TARGET, y: MOVE_TARGET } }
  })

  const timing = measureStepTiming((tick) => sim.step([command(tick)]), steps)
  const sorted = [...timing.samples].sort((a, b) => a - b)
  const avgMs = average(timing.samples)
  const hashMs = measureAverageMs(() => void sim.hashState(), TIMING_SAMPLES)
  const serializeMs = measureAverageMs(() => void sim.exportSnapshot(), TIMING_SAMPLES)

  return {
    entityCount,
    steps,
    avgMs,
    p50Ms: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    p99Ms: percentile(sorted, 0.99),
    maxMs: sorted.at(-1) ?? 0,
    ticksPerSecond: avgMs > 0 ? 1000 / avgMs : Number.POSITIVE_INFINITY,
    heapDeltaMiB: timing.heapDeltaMiB,
    hashMs,
    serializeMs,
    // Estimated single-core CPU (ms/s) when simulating at the given tick rate:
    // average step cost × ticks per second.
    cpuPercentAt20: avgMs * 20,
    cpuPercentAt30: avgMs * 30,
    cpuPercentAt60: avgMs * 60
  }
}
