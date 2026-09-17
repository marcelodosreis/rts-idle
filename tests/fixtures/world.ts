import { allocateEntityId, type PlayerId, START_ENTITY_ID, tilesToFixed } from '@rts/shared'
import { assignBaselineStats, createWorld, Owner, Position, type UnitClassKind, type World } from '@rts/simulation'

/**
 * Builds a world with one unit per owner entry, ids allocated from
 * START_ENTITY_ID, all units at the origin. Owner slots are real player slots.
 */
export function worldWithOwners(owners: readonly PlayerId[]): World {
  const world = createWorld()
  let next = START_ENTITY_ID
  for (const owner of owners) {
    const allocated = allocateEntityId(next)
    next = allocated.nextEntityId
    world.createEntity(allocated.id)
    world.store(Position).set(allocated.id, { x: 0, y: 0 })
    world.store(Owner).set(allocated.id, { owner })
  }
  return world
}

/** Builds a world with `count` units all owned by `owner`. */
export function worldWithUnits(count: number, owner: PlayerId = 0): World {
  return worldWithOwners(Array.from({ length: count }, () => owner))
}

export interface CombatantSpawn {
  readonly owner: PlayerId
  readonly kind: UnitClassKind
  /** Tile coordinates (converted to fixed). */
  readonly x: number
  readonly y: number
}

/** Builds a world of combatants with baseline stats at tile coordinates. */
export function worldWithCombatants(spawns: readonly CombatantSpawn[]): World {
  const world = createWorld()
  let next = START_ENTITY_ID
  for (const spawn of spawns) {
    const allocated = allocateEntityId(next)
    next = allocated.nextEntityId
    world.createEntity(allocated.id)
    world.store(Position).set(allocated.id, { x: tilesToFixed(spawn.x), y: tilesToFixed(spawn.y) })
    world.store(Owner).set(allocated.id, { owner: spawn.owner })
    assignBaselineStats(world, allocated.id, spawn.kind)
  }
  return world
}
