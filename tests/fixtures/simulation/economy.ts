import { START_ENTITY_ID, tilesToFixed } from '@rts/shared'
import {
  Building,
  Cargo,
  createWorld,
  Kind,
  MineralNode,
  Owner,
  Position,
  type ScheduledCommand
} from '@rts/simulation'

interface EconomyScenarioOptions {
  readonly workerCount?: number
  readonly nodeX?: number
  readonly nodeMinerals?: number
  readonly includeBase?: boolean
}

export function economyScenario(options: EconomyScenarioOptions = {}) {
  const world = createWorld()
  const base = START_ENTITY_ID
  const workers = Array.from({ length: options.workerCount ?? 1 }, (_, index) => START_ENTITY_ID + 1 + index)
  const node = START_ENTITY_ID + 1 + workers.length
  if (options.includeBase !== false) {
    world.createEntity(base)
    world.store(Position).set(base, { x: 0, y: 0 })
    world.store(Owner).set(base, { owner: 0 })
    world.store(Building).set(base, {
      buildingType: 'CASTLE',
      status: 'COMPLETED',
      progressTicks: 1,
      totalTicks: 1,
      builderId: null,
      footprint: { x: 0, y: 0, width: 2, height: 2 }
    })
  }
  for (const worker of workers) {
    world.createEntity(worker)
    world.store(Position).set(worker, { x: 0, y: 0 })
    world.store(Owner).set(worker, { owner: 0 })
    world.store(Kind).set(worker, 'pawn')
    world.store(Cargo).set(worker, { amount: 0, capacity: 10 })
  }
  world.createEntity(node)
  world.store(Position).set(node, { x: options.nodeX ?? tilesToFixed(1), y: 0 })
  world.store(MineralNode).set(node, { remaining: options.nodeMinerals ?? 3_000 })
  // Keep economy command fixtures in RUNNING phase after the common command admission rule was introduced.
  const opponent = 100_000
  world.createEntity(opponent)
  world.store(Position).set(opponent, { x: tilesToFixed(31), y: tilesToFixed(31) })
  world.store(Owner).set(opponent, { owner: 1 })
  return { world, base, workers, node }
}

export function gatherCommand(workers: readonly number[], node: number): ScheduledCommand {
  return {
    tick: 1,
    playerId: 0,
    sequence: 1,
    intent: { type: 'GATHER', payload: { unitIds: workers, nodeId: node } }
  }
}
