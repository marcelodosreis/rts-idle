import { START_ENTITY_ID, tilesToFixed } from '@rts/shared'
import { Building, Cargo, createWorld, Kind, Owner, Position, type ScheduledCommand } from '@rts/simulation'

interface EconomyScenarioOptions {
  readonly workerCount?: number
  readonly nodeX?: number
  readonly resourceAmount?: number
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
    world.store(Cargo).set(worker, { amount: 0, capacity: 10, resourceType: null })
  }
  // Keep economy command fixtures in RUNNING phase after the common command admission rule was introduced.
  const opponent = 100_000
  world.createEntity(opponent)
  world.store(Position).set(opponent, { x: tilesToFixed(31), y: tilesToFixed(31) })
  world.store(Owner).set(opponent, { owner: 1 })
  const resources = [
    {
      resourceId: node,
      kind: 'GOLD_MINE' as const,
      x: options.nodeX ?? tilesToFixed(1),
      y: 0,
      variant: 0,
      initialAmount: options.resourceAmount ?? 3_000,
      harvestAmount: 10,
      harvestTicks: 200,
      blocksNavigation: false
    }
  ]
  return { world, base, workers, node, resources }
}

export function gatherCommand(workers: readonly number[], node: number): ScheduledCommand {
  return {
    tick: 1,
    playerId: 0,
    sequence: 1,
    intent: { type: 'GATHER', payload: { unitIds: workers, resourceId: node } }
  }
}
