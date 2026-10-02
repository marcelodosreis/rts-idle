import { type UnitDefinition, unitDefinitionFor } from '@rts/game-data'
import { allocateEntityId, type PlayerId, START_ENTITY_ID } from '@rts/shared'
import { Combat, createWorld, Health, Owner, Position, type World } from '@rts/simulation'

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

export interface CombatSpawnOptions {
  /** Placement in fixed units; defaults to `gridPosition(i, 4, 512)`. */
  readonly position?: { readonly x: number; readonly y: number }
  readonly stats?: UnitDefinition
}

/**
 * Builds a world where every unit is a combatant: Position, Owner, Health, and
 * Combat components are set with the authored baseline stats, so combat
 * fixtures can rely on attacks dealing damage and units dying.
 */
export function worldWithCombatUnits(owners: readonly PlayerId[], options: CombatSpawnOptions = {}): World {
  const world = createWorld()
  const stats = options.stats ?? unitDefinitionFor('pawn')
  let next = START_ENTITY_ID
  for (const owner of owners) {
    const allocated = allocateEntityId(next)
    next = allocated.nextEntityId
    world.createEntity(allocated.id)
    world.store(Position).set(allocated.id, options.position ?? { x: 0, y: 0 })
    world.store(Owner).set(allocated.id, { owner })
    world.store(Health).set(allocated.id, { current: stats.maxHp, max: stats.maxHp })
    world.store(Combat).set(allocated.id, {
      damage: stats.damage,
      rangeTiles: stats.rangeTiles,
      cooldownTicks: stats.cooldownTicks,
      cooldownRemaining: 0
    })
  }
  return world
}
