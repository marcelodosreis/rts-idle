import { allocateEntityId, FIXED_SCALE, START_ENTITY_ID } from '@rts/shared'
import type { ComponentKey, WorldInstrumentation } from '@rts/simulation'
import {
  Combat,
  createRulesIdentity,
  createSimulation,
  createUnitEntity,
  createWorld,
  Health,
  Movement,
  Orders,
  type World
} from '@rts/simulation'
import { percentile } from './stats.js'
import { measureStepTiming } from './timing.js'

export const ECS_QUERY_SCENARIOS = [
  'mixed-1k-idle',
  'mixed-1k-moving',
  'combat-100v100',
  'combat-500v500',
  'mixed-combat-200-of-1000'
] as const

export type EcsQueryScenario = (typeof ECS_QUERY_SCENARIOS)[number]

const WARMUP_STEPS = 20
const DEFAULT_MEASUREMENT_STEPS = 200
const DEFAULT_REPETITIONS = 5
const DEFAULT_SEED = 73421
const GRID_COLUMNS = 32
const FIXED_TILE_SPACING = FIXED_SCALE
const FAR_TARGET = 100_000

interface ScenarioDefinition {
  readonly units: number
  readonly combatants: number
  readonly moving: boolean
}

interface ScenarioCounters {
  aliveIdsCalls: number
  aliveIdsRebuilds: number
  queryCalls: number
  componentIdsRebuilds: number
  queryCandidatesVisited: number
  combatCandidateChecks: number
}

export interface EcsQueryRow {
  readonly scenario: EcsQueryScenario
  readonly units: number
  readonly repetitions: number
  readonly steps: number
  readonly medianAvgMs: number
  readonly medianP50Ms: number
  readonly medianP95Ms: number
  readonly medianP99Ms: number
  readonly medianMaxMs: number
  readonly medianTicksPerSecond: number
  readonly medianHeapDeltaMiB: number
  readonly aliveIdsCalls: number
  readonly aliveIdsRebuilds: number
  readonly queryCalls: number
  readonly componentIdsRebuilds: number
  readonly queryCandidatesVisited: number
  readonly combatCandidateChecks: number
}

interface SingleRun {
  readonly avgMs: number
  readonly p50Ms: number
  readonly p95Ms: number
  readonly p99Ms: number
  readonly maxMs: number
  readonly ticksPerSecond: number
  readonly heapDeltaMiB: number
}

function scenarioDefinition(scenario: EcsQueryScenario): ScenarioDefinition {
  switch (scenario) {
    case 'mixed-1k-idle':
      return { units: 1_000, combatants: 0, moving: false }
    case 'mixed-1k-moving':
      return { units: 1_000, combatants: 0, moving: true }
    case 'combat-100v100':
      return { units: 200, combatants: 200, moving: false }
    case 'combat-500v500':
      return { units: 1_000, combatants: 1_000, moving: false }
    case 'mixed-combat-200-of-1000':
      return { units: 1_000, combatants: 200, moving: false }
  }
}

function scenarioPosition(index: number): { readonly x: number; readonly y: number } {
  return {
    x: (index % GRID_COLUMNS) * FIXED_TILE_SPACING,
    y: Math.floor(index / GRID_COLUMNS) * FIXED_TILE_SPACING
  }
}

function createInstrumentation(counters: ScenarioCounters): WorldInstrumentation {
  return {
    onAliveIdsCall: () => {
      counters.aliveIdsCalls += 1
    },
    onAliveIdsRebuild: () => {
      counters.aliveIdsRebuilds += 1
    },
    onQuery: () => {
      counters.queryCalls += 1
    },
    onQueryCandidate: (components: readonly ComponentKey[]) => {
      counters.queryCandidatesVisited += 1
      if (components.length === 1 && components[0]?.name === 'position') {
        counters.combatCandidateChecks += 1
      }
    },
    onComponentIdsRebuild: () => {
      counters.componentIdsRebuilds += 1
    }
  }
}

function buildScenarioWorld(scenario: EcsQueryScenario, instrumentation?: WorldInstrumentation): World {
  const definition = scenarioDefinition(scenario)
  const world = createScenarioWorld(instrumentation)
  let nextEntityId = START_ENTITY_ID
  for (let index = 0; index < definition.units; index += 1) {
    const allocated = allocateEntityId(nextEntityId)
    nextEntityId = allocated.nextEntityId
    const owner = index < definition.units / 2 ? 0 : 1
    const position = scenarioPosition(index)
    createUnitEntity(world, {
      id: allocated.id,
      x: position.x,
      y: position.y,
      owner,
      kind: definition.combatants > index ? 'warrior' : 'pawn',
      worker: definition.combatants <= index
    })
    if (definition.moving) {
      world.store(Movement).set(allocated.id, {
        speedTilesPerSecondFixed: FIXED_SCALE,
        destX: FAR_TARGET,
        destY: FAR_TARGET,
        remainderX: 0,
        remainderY: 0
      })
    }
    if (index >= definition.combatants) {
      world.store(Combat).delete(allocated.id)
    } else if (index % 10 === 0) {
      world.store(Orders).set(allocated.id, { queue: [{ type: 'HOLD' }] })
      world.store(Health).set(allocated.id, { current: 100_000, max: 100_000 })
      world.store(Combat).set(allocated.id, {
        armor: 0,
        damage: 1,
        rangeTiles: 100,
        cooldownTicks: 1_000,
        cooldownRemaining: 0
      })
    } else {
      world.store(Health).set(allocated.id, { current: 100_000, max: 100_000 })
    }
  }
  return world
}

function createScenarioWorld(instrumentation?: WorldInstrumentation): World {
  return instrumentation === undefined ? createWorld() : createWorld({ instrumentation })
}

function runSingle(scenario: EcsQueryScenario, steps: number, seed: number): SingleRun {
  const world = buildScenarioWorld(scenario)
  const simulation = createSimulation({
    seed,
    identity: createRulesIdentity('ecs-query-benchmark'),
    initialWorld: world
  })
  for (let tick = 0; tick < WARMUP_STEPS; tick += 1) {
    simulation.step()
  }
  const timing = measureStepTiming(() => simulation.step(), steps)
  const sorted = [...timing.samples].sort((a, b) => a - b)
  const avgMs = timing.samples.reduce((total, sample) => total + sample, 0) / timing.samples.length
  return {
    avgMs,
    p50Ms: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    p99Ms: percentile(sorted, 0.99),
    maxMs: sorted.at(-1) ?? 0,
    ticksPerSecond: avgMs > 0 ? 1_000 / avgMs : Number.POSITIVE_INFINITY,
    heapDeltaMiB: timing.heapDeltaMiB
  }
}

function emptyCounters(): ScenarioCounters {
  return {
    aliveIdsCalls: 0,
    aliveIdsRebuilds: 0,
    queryCalls: 0,
    componentIdsRebuilds: 0,
    queryCandidatesVisited: 0,
    combatCandidateChecks: 0
  }
}

function resetCounters(counters: ScenarioCounters): void {
  counters.aliveIdsCalls = 0
  counters.aliveIdsRebuilds = 0
  counters.queryCalls = 0
  counters.componentIdsRebuilds = 0
  counters.queryCandidatesVisited = 0
  counters.combatCandidateChecks = 0
}

function runInstrumentation(scenario: EcsQueryScenario, steps: number, seed: number): ScenarioCounters {
  const counters = emptyCounters()
  const world = buildScenarioWorld(scenario, createInstrumentation(counters))
  const simulation = createSimulation({
    seed,
    identity: createRulesIdentity('ecs-query-benchmark'),
    initialWorld: world
  })
  resetCounters(counters)
  for (let tick = 0; tick < WARMUP_STEPS; tick += 1) {
    simulation.step()
  }
  resetCounters(counters)
  for (let tick = 0; tick < steps; tick += 1) {
    simulation.step()
  }
  return counters
}

function median(values: readonly number[]): number {
  return percentile(
    [...values].sort((a, b) => a - b),
    0.5
  )
}

export function runEcsQueryBenchmark(
  scenarios: readonly EcsQueryScenario[] = ECS_QUERY_SCENARIOS,
  steps = DEFAULT_MEASUREMENT_STEPS,
  repetitions = DEFAULT_REPETITIONS,
  seed = DEFAULT_SEED
): readonly EcsQueryRow[] {
  return scenarios.map((scenario) => {
    const runs = Array.from({ length: repetitions }, () => runSingle(scenario, steps, seed))
    const metrics = runInstrumentation(scenario, steps, seed)
    const definition = scenarioDefinition(scenario)
    return {
      scenario,
      units: definition.units,
      repetitions,
      steps,
      medianAvgMs: median(runs.map((run) => run.avgMs)),
      medianP50Ms: median(runs.map((run) => run.p50Ms)),
      medianP95Ms: median(runs.map((run) => run.p95Ms)),
      medianP99Ms: median(runs.map((run) => run.p99Ms)),
      medianMaxMs: median(runs.map((run) => run.maxMs)),
      medianTicksPerSecond: median(runs.map((run) => run.ticksPerSecond)),
      medianHeapDeltaMiB: median(runs.map((run) => run.heapDeltaMiB)),
      aliveIdsCalls: metrics.aliveIdsCalls,
      aliveIdsRebuilds: metrics.aliveIdsRebuilds,
      queryCalls: metrics.queryCalls,
      componentIdsRebuilds: metrics.componentIdsRebuilds,
      queryCandidatesVisited: metrics.queryCandidatesVisited,
      combatCandidateChecks: metrics.combatCandidateChecks
    }
  })
}
