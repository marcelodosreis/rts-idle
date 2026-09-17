import { cpus } from 'node:os'
import { allocateEntityId, START_ENTITY_ID } from '@rts/shared'
import type { ScheduledCommand } from '@rts/simulation'
import { createSimulation, createWorld, Owner, Position, type RulesIdentity, type World } from '@rts/simulation'

const BENCH_IDENTITY: RulesIdentity = {
  simulationVersion: '0.1.0',
  rulesetVersion: 'bench',
  rulesetHash: 'bench',
  mapId: 'bench',
  mapHash: 'bench'
}

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

export interface SimulationBenchmarkResult {
  readonly seed: number
  readonly hardware: string
  readonly platform: string
  readonly nodeVersion: string
  readonly rows: readonly BenchmarkRow[]
}

function buildWorld(entityCount: number): World {
  const world = createWorld()
  let next = START_ENTITY_ID
  for (let i = 0; i < entityCount; i += 1) {
    const allocated = allocateEntityId(next)
    next = allocated.nextEntityId
    world.createEntity(allocated.id)
    world.store(Position).set(allocated.id, { x: (i % 64) * 256, y: Math.floor(i / 64) * 256 })
    world.store(Owner).set(allocated.id, { owner: 0 })
  }
  return world
}

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) {
    return 0
  }
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))
  return sorted[index] ?? 0
}

function benchmarkRow(entityCount: number, steps: number, seed: number): BenchmarkRow {
  const world = buildWorld(entityCount)
  const sim = createSimulation({ seed, identity: BENCH_IDENTITY, initialWorld: world })
  const moveIds = world.aliveIds().slice(0, 256)

  for (let i = 0; i < 10; i += 1) {
    sim.step()
  }

  const command = (tick: number): ScheduledCommand => ({
    tick,
    playerId: 0,
    sequence: tick,
    intent: { type: 'MOVE', payload: { unitIds: moveIds, x: 50000, y: 50000 } }
  })

  const samples: number[] = []
  const heapBefore = process.memoryUsage().heapUsed
  for (let t = 1; t <= steps; t += 1) {
    const start = performance.now()
    sim.step([command(t)])
    samples.push(performance.now() - start)
  }
  const heapDeltaMiB = (process.memoryUsage().heapUsed - heapBefore) / (1024 * 1024)

  const sorted = [...samples].sort((a, b) => a - b)
  const avgMs = samples.reduce((acc, v) => acc + v, 0) / samples.length

  let hashMs = 0
  const hashSamples = 20
  for (let i = 0; i < hashSamples; i += 1) {
    const start = performance.now()
    sim.hashState()
    hashMs += performance.now() - start
  }
  hashMs /= hashSamples

  let serializeMs = 0
  const snapshot = sim.exportSnapshot()
  const serializeSamples = 20
  for (let i = 0; i < serializeSamples; i += 1) {
    const start = performance.now()
    void sim.exportSnapshot()
    serializeMs += performance.now() - start
  }
  serializeMs /= serializeSamples
  void snapshot

  return {
    entityCount,
    steps,
    avgMs,
    p50Ms: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    p99Ms: percentile(sorted, 0.99),
    maxMs: sorted.at(-1) ?? 0,
    ticksPerSecond: avgMs > 0 ? 1000 / avgMs : Number.POSITIVE_INFINITY,
    heapDeltaMiB,
    hashMs,
    serializeMs,
    cpuPercentAt20: avgMs * 20,
    cpuPercentAt30: avgMs * 30,
    cpuPercentAt60: avgMs * 60
  }
}

export function runSimulationBenchmark(
  entityCounts: readonly number[],
  steps: number,
  seed: number
): SimulationBenchmarkResult {
  return {
    seed,
    hardware: osHardware(),
    platform: process.platform,
    nodeVersion: process.version,
    rows: entityCounts.map((count) => benchmarkRow(count, steps, seed))
  }
}

function osHardware(): string {
  const cpuList = cpus()
  const model = cpuList[0]?.model ?? 'unknown'
  const cores = cpuList.length
  return `${model} (${cores} threads)`
}
