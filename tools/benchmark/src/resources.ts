import type { ResourceDefinition } from '@rts/shared'
import { createResourceState, createRulesIdentity, createSimulation } from '@rts/simulation'
import { measureAverageMs } from './timing.js'

const TREE: Omit<ResourceDefinition, 'resourceId' | 'x' | 'y'> = {
  kind: 'TREE',
  variant: 0,
  initialAmount: 30,
  harvestAmount: 10,
  harvestTicks: 200,
  blocksNavigation: false
}
const RESOURCE_COLUMNS = 250
const TIMING_SAMPLES = 20
const SMALL_DELTA_SIZE = 5

export interface ResourceBenchmarkRow {
  readonly resourceCount: number
  readonly ecsEntityCount: number
  readonly createMs: number
  readonly lookupMs: number
  readonly idleTickMs: number
  readonly deltaIdleCount: number
  readonly deltaIdleMs: number
  readonly deltaOneCount: number
  readonly deltaOneMs: number
  readonly deltaSmallCount: number
  readonly deltaSmallMs: number
  readonly depletionMs: number
  readonly snapshotBytes: number
  readonly snapshotMs: number
}

function trees(count: number): readonly ResourceDefinition[] {
  return Array.from({ length: count }, (_, resourceId) => ({
    ...TREE,
    resourceId,
    x: (resourceId % RESOURCE_COLUMNS) * 256,
    y: Math.floor(resourceId / RESOURCE_COLUMNS) * 256
  }))
}

/**
 * Measures compact resource creation, indexed lookup, canonical snapshot, and
 * the delta generator: idle (no changes), one changed resource, and a small
 * changed set. The idle delta must stay O(changed), so 50k static resources
 * never rescan the catalog per tick.
 */
export function measureResourceRow(resourceCount: number, seed: number): ResourceBenchmarkRow {
  const definitions = trees(resourceCount)
  const start = performance.now()
  const simulation = createSimulation({
    seed,
    identity: createRulesIdentity('resource-bench'),
    resources: definitions
  })
  const createMs = performance.now() - start
  const state = simulation.inspectState()
  const lookupMs = measureAverageMs(
    () => void state.resources.findNearest({ x: 0, y: 0, resourceType: 'WOOD' }),
    TIMING_SAMPLES
  )
  const snapshot = simulation.exportSnapshot()

  const deltaState = createResourceState(definitions)
  deltaState.beginTick()
  const deltaIdleMs = measureAverageMs(() => void deltaState.changed(), TIMING_SAMPLES)
  const deltaIdleCount = deltaState.changed().length
  deltaState.harvest(0, TREE.harvestAmount)
  const deltaOneMs = measureAverageMs(() => void deltaState.changed(), TIMING_SAMPLES)
  const deltaOneCount = deltaState.changed().length

  deltaState.beginTick()
  for (let resourceId = 0; resourceId < SMALL_DELTA_SIZE; resourceId += 1) {
    deltaState.harvest(resourceId, TREE.harvestAmount)
  }
  const deltaSmallMs = measureAverageMs(() => void deltaState.changed(), TIMING_SAMPLES)
  const deltaSmallCount = deltaState.changed().length

  const depletionStart = performance.now()
  state.resources.harvest(0, TREE.harvestAmount)
  const depletionMs = performance.now() - depletionStart
  return {
    resourceCount,
    ecsEntityCount: state.world.aliveIds().length,
    createMs,
    lookupMs,
    idleTickMs: measureAverageMs(() => void simulation.step(), TIMING_SAMPLES),
    deltaIdleCount,
    deltaIdleMs,
    deltaOneCount,
    deltaOneMs,
    deltaSmallCount,
    deltaSmallMs,
    depletionMs,
    snapshotBytes: snapshot.bytes.byteLength,
    snapshotMs: measureAverageMs(() => void simulation.exportSnapshot(), TIMING_SAMPLES)
  }
}
