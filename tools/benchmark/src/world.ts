import { allocateEntityId, FIXED_SCALE, gridPosition, START_ENTITY_ID } from '@rts/shared'
import { createWorld, Owner, Position, type World } from '@rts/simulation'

/** Benchmark units are laid out on a 64-column tile grid. */
const GRID_COLUMNS = 64

/** Builds an all-owner-0 grid world for benchmark runs. */
export function buildBenchmarkWorld(entityCount: number): World {
  const world = createWorld()
  let next = START_ENTITY_ID
  for (let i = 0; i < entityCount; i += 1) {
    const allocated = allocateEntityId(next)
    next = allocated.nextEntityId
    world.createEntity(allocated.id)
    world.store(Position).set(allocated.id, gridPosition(i, GRID_COLUMNS, FIXED_SCALE))
    world.store(Owner).set(allocated.id, { owner: 0 })
  }
  return world
}
