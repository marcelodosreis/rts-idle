import { FIXED_SCALE, START_ENTITY_ID } from '@rts/shared'
import {
  createRulesIdentity,
  createSimulation,
  createUnitEntity,
  createWorld,
  type SimulationHost
} from '@rts/simulation'

const DEFAULT_ENTITY_COUNT = 10_000
const DEFAULT_REPETITIONS = 20

export interface SnapshotDeltaBenchmarkResult {
  readonly entityCount: number
  readonly repetitions: number
  readonly idleChangedEntities: number
  readonly activeChangedEntities: number
  readonly idleObservationMs: number
  readonly activeObservationMs: number
}

function createHost(entityCount: number): SimulationHost {
  const world = createWorld()
  for (let index = 0; index < entityCount; index += 1) {
    createUnitEntity(world, {
      id: START_ENTITY_ID + index,
      x: (index % 100) * FIXED_SCALE,
      y: Math.floor(index / 100) * FIXED_SCALE,
      owner: index % 2 === 0 ? 0 : 1,
      kind: 'pawn'
    })
  }
  return createSimulation({
    seed: 42,
    identity: createRulesIdentity('snapshot-delta-benchmark'),
    initialWorld: world
  })
}

function observationMs(host: SimulationHost, entityIds: readonly number[], repetitions: number): number {
  const started = performance.now()
  for (let repetition = 0; repetition < repetitions; repetition += 1) {
    host.observe(false, entityIds)
  }
  return performance.now() - started
}

export function runSnapshotDeltaBenchmark(
  entityCount = DEFAULT_ENTITY_COUNT,
  repetitions = DEFAULT_REPETITIONS
): SnapshotDeltaBenchmarkResult {
  const idleHost = createHost(entityCount)
  const idleCursor = idleHost.changeCursor()
  idleHost.step()
  const idleChanges = idleHost.changesSince(idleCursor)
  const idleIds = [...idleChanges.createdIds, ...idleChanges.dirtyIds]

  const activeHost = createHost(entityCount)
  const activeCursor = activeHost.changeCursor()
  activeHost.step([
    {
      tick: 1,
      playerId: 0,
      sequence: 1,
      intent: { type: 'MOVE', payload: { unitIds: [START_ENTITY_ID], x: FIXED_SCALE, y: FIXED_SCALE } }
    }
  ])
  const activeChanges = activeHost.changesSince(activeCursor)
  const activeIds = [...activeChanges.createdIds, ...activeChanges.dirtyIds]

  return {
    entityCount,
    repetitions,
    idleChangedEntities: idleIds.length,
    activeChangedEntities: activeIds.length,
    idleObservationMs: observationMs(idleHost, idleIds, repetitions),
    activeObservationMs: observationMs(activeHost, activeIds, repetitions)
  }
}
