import { execSync } from 'node:child_process'
import { allocateEntityId, type PlayerId, START_ENTITY_ID, tilesToFixed, type UnitKind } from '@rts/shared'
import {
  createRulesIdentity,
  createSimulation,
  createUnitEntity,
  createWorld,
  type ScheduledCommand,
  type SimulationHost
} from '@rts/simulation'
import { describeEnvironment } from './environment.js'
import { average, percentile } from './stats.js'

const ENTITY_COUNT = 500
const TICKS = 400
const WARMUP_TICKS = 100
const REPETITIONS = 5
const SEED = 123456
const KINDS: readonly UnitKind[] = ['pawn', 'warrior', 'archer', 'lancer', 'monk']

interface ArmyBenchmarkRow {
  readonly repetition: number
  readonly averageMs: number
  readonly p50Ms: number
  readonly p95Ms: number
  readonly p99Ms: number
  readonly maxMs: number
  readonly ticksPerSecond: number
  readonly heapDeltaMiB: number
}

export interface ArmyChokepointBenchmark {
  readonly hardware: string
  readonly platform: string
  readonly nodeVersion: string
  readonly seed: number
  readonly commit: string
  readonly rows: readonly ArmyBenchmarkRow[]
  readonly medianP95Ms: number
  readonly gatePassed: boolean
}

function tile(index: number, perRow: number): { readonly x: number; readonly y: number } {
  return { x: 5 + (index % perRow), y: 5 + Math.floor(index / perRow) }
}

interface ArmySetup {
  readonly simulation: SimulationHost
  readonly attackers: readonly [readonly number[], readonly number[]]
  readonly monks: readonly [readonly number[], readonly number[]]
  readonly archers: readonly [number, number]
  readonly enemyTargets: readonly [number, number]
}

function createArmyWorld(): ArmySetup {
  const world = createWorld()
  let next = START_ENTITY_ID
  const attackers: [number[], number[]] = [[], []]
  const monks: [number[], number[]] = [[], []]
  const archers: [number, number] = [0, 0]
  const perRow = 23
  for (let index = 0; index < ENTITY_COUNT; index += 1) {
    const allocated = allocateEntityId(next)
    next = allocated.nextEntityId
    const owner = (index % 2) as 0 | 1
    const kind = KINDS[index % KINDS.length]!
    const position = tile(index, perRow)
    createUnitEntity(world, {
      id: allocated.id,
      kind,
      owner,
      x: tilesToFixed(position.x),
      y: tilesToFixed(position.y)
    })
    if (kind === 'monk') {
      monks[owner].push(allocated.id)
    } else {
      attackers[owner].push(allocated.id)
    }
    if (kind === 'archer' && archers[owner] === 0) {
      archers[owner] = allocated.id
    }
  }
  const players = [0, 1, 2, 3].map((id) => ({
    id: id as PlayerId,
    defeated: false,
    resources: { GOLD: id === 0 || id === 1 ? 100 : 0, WOOD: 0 },
    completedResearch: [] as const
  }))
  const simulation = createSimulation({
    seed: SEED,
    identity: createRulesIdentity('army-chokepoint'),
    initialWorld: world,
    initialPlayers: players,
    mapBounds: {
      width: 32,
      height: 32,
      invalidTiles: Array.from({ length: 32 }, (_rowIndex, row) =>
        Array.from({ length: 32 }, (_columnIndex, column) => ({ x: column, y: row }))
      )
        .flat()
        .filter(({ x, y }) => x < 4 || x >= 28 || y < 4 || y >= 28)
    }
  })
  return {
    simulation,
    attackers,
    monks,
    archers,
    enemyTargets: [attackers[1][0]!, attackers[0][0]!]
  }
}

function commandsFor(tick: number, setup: ArmySetup): readonly ScheduledCommand[] {
  if (tick === 1) {
    return ([0, 1] as const).flatMap((playerId) => [
      {
        tick,
        playerId: playerId as PlayerId,
        sequence: 1,
        intent: {
          type: 'ATTACK_MOVE' as const,
          payload: {
            unitIds: setup.attackers[playerId]!,
            x: tilesToFixed(playerId === 0 ? 20 : 8),
            y: tilesToFixed(playerId === 0 ? 20 : 8)
          }
        }
      },
      {
        tick,
        playerId: playerId as PlayerId,
        sequence: 2,
        intent: {
          type: 'MOVE' as const,
          payload: {
            unitIds: setup.monks[playerId]!,
            x: tilesToFixed(playerId === 0 ? 20 : 8),
            y: tilesToFixed(playerId === 0 ? 20 : 8)
          }
        }
      }
    ])
  }
  if (tick === 40) {
    return [
      {
        tick,
        playerId: 0,
        sequence: 3,
        intent: {
          type: 'EXPLOSIVE_SHOT',
          payload: { unitIds: [setup.archers[0]], targetId: setup.enemyTargets[0] }
        }
      }
    ]
  }
  if (tick === 60) {
    return [
      {
        tick,
        playerId: 1,
        sequence: 3,
        intent: {
          type: 'EXPLOSIVE_SHOT',
          payload: { unitIds: [setup.archers[1]], targetId: setup.enemyTargets[1] }
        }
      }
    ]
  }
  return []
}

function measureRun(): ArmyBenchmarkRow {
  const setup = createArmyWorld()
  const { simulation } = setup
  for (let tick = 1; tick <= WARMUP_TICKS; tick += 1) {
    simulation.step(commandsFor(tick, setup))
  }
  const heapBefore = process.memoryUsage().heapUsed
  const samples: number[] = []
  const start = performance.now()
  for (let tick = WARMUP_TICKS + 1; tick <= WARMUP_TICKS + TICKS; tick += 1) {
    const tickStart = performance.now()
    simulation.step(commandsFor(tick, setup))
    samples.push(performance.now() - tickStart)
  }
  const elapsed = performance.now() - start
  const total = samples.reduce((sum, value) => sum + value, 0)
  return {
    repetition: 0,
    averageMs: total / samples.length,
    p50Ms: percentile(samples, 50),
    p95Ms: percentile(samples, 95),
    p99Ms: percentile(samples, 99),
    maxMs: Math.max(...samples),
    ticksPerSecond: (samples.length * 1000) / elapsed,
    heapDeltaMiB: (process.memoryUsage().heapUsed - heapBefore) / (1024 * 1024)
  }
}

function commitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

/** Runs the Phase 3 headless army/chokepoint performance gate. */
export function runArmyChokepointBenchmark(): ArmyChokepointBenchmark {
  const environment = describeEnvironment()
  const rows = Array.from({ length: REPETITIONS }, (_, repetition) => ({
    ...measureRun(),
    repetition: repetition + 1
  }))
  const medianP95Ms = percentile(
    rows.map((row) => row.p95Ms),
    50
  )
  return {
    ...environment,
    seed: SEED,
    commit: commitHash(),
    rows,
    medianP95Ms,
    gatePassed: medianP95Ms <= 10
  }
}

/** Formats the benchmark result for the CLI. */
export function formatArmyChokepoint(result: ArmyChokepointBenchmark): readonly string[] {
  const lines = [
    '=== Army chokepoint benchmark ===',
    `hardware: ${result.hardware}`,
    `platform: ${result.platform} · node ${result.nodeVersion} · seed ${result.seed} · commit ${result.commit}`,
    `entities: ${ENTITY_COUNT} · repetitions: ${REPETITIONS} · warmup: ${WARMUP_TICKS} ticks · measured: ${TICKS} ticks`,
    'repetition | average ms | p50 ms | p95 ms | p99 ms | max ms | ticks/s | heapMiB'
  ]
  for (const row of result.rows) {
    lines.push(
      [
        row.repetition,
        row.averageMs.toFixed(4),
        row.p50Ms.toFixed(4),
        row.p95Ms.toFixed(4),
        row.p99Ms.toFixed(4),
        row.maxMs.toFixed(4),
        row.ticksPerSecond.toFixed(2),
        row.heapDeltaMiB.toFixed(4)
      ].join(' | ')
    )
  }
  lines.push(
    `median p95: ${result.medianP95Ms.toFixed(4)} ms · gate (<= 10 ms): ${result.gatePassed ? 'PASS' : 'FAIL'}`
  )
  lines.push(`average across runs: ${average(result.rows.map((row) => row.averageMs)).toFixed(4)} ms`)
  return lines
}
