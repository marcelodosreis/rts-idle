import { allocateEntityId, type PlayerId, START_ENTITY_ID } from '@rts/shared'
import { createWorld, Owner, Position, type World } from '@rts/simulation'

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
