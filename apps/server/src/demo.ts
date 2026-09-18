import { allocateEntityId, type Fixed, type PlayerId, START_ENTITY_ID, tilesToFixed } from '@rts/shared'
import {
  Combat,
  createRulesIdentity,
  createWorld,
  Health,
  Orders,
  Owner,
  Position,
  type RulesIdentity,
  UNIT_COMBAT_STATS
} from '@rts/simulation'
import { GameSession } from './sessions/session.js'

export const DEMO_IDENTITY: RulesIdentity = createRulesIdentity('demo')

interface DemoSpawn {
  readonly owner: PlayerId
  readonly x: Fixed
  readonly y: Fixed
}

// Spawn positions authored in tiles and converted to fixed units. The demo map
// is 32 tiles wide; player 1 starts in the far-right corner, mirrored.
const DEMO_SPAWNS: readonly DemoSpawn[] = [
  { owner: 0, x: tilesToFixed(8), y: tilesToFixed(8) },
  { owner: 0, x: tilesToFixed(9), y: tilesToFixed(8) },
  { owner: 0, x: tilesToFixed(8), y: tilesToFixed(9) },
  { owner: 0, x: tilesToFixed(9), y: tilesToFixed(9) },
  { owner: 1, x: tilesToFixed(23), y: tilesToFixed(23) },
  { owner: 1, x: tilesToFixed(24), y: tilesToFixed(23) },
  { owner: 1, x: tilesToFixed(23), y: tilesToFixed(24) },
  { owner: 1, x: tilesToFixed(24), y: tilesToFixed(24) }
]

const BLUE_UNITS = 4

/**
 * Hostile demo: two mirrored squads with combat stats that immediately engage
 * each other (blue `i` is ordered to attack red `i` and vice versa). The player
 * is player 0 and can override the standing ATTACK orders with a MOVE command.
 */
export function createDemoSession(): GameSession {
  const world = createWorld()
  let next = START_ENTITY_ID
  const ids: number[] = []
  for (const spawn of DEMO_SPAWNS) {
    const allocated = allocateEntityId(next)
    next = allocated.nextEntityId
    world.createEntity(allocated.id)
    world.store(Position).set(allocated.id, { x: spawn.x, y: spawn.y })
    world.store(Owner).set(allocated.id, { owner: spawn.owner })
    world.store(Health).set(allocated.id, {
      current: UNIT_COMBAT_STATS.maxHp,
      max: UNIT_COMBAT_STATS.maxHp
    })
    world.store(Combat).set(allocated.id, {
      damage: UNIT_COMBAT_STATS.damage,
      rangeTiles: UNIT_COMBAT_STATS.rangeTiles,
      cooldownTicks: UNIT_COMBAT_STATS.cooldownTicks,
      cooldownRemaining: 0
    })
    ids.push(allocated.id)
  }
  // Deterministic mutual engagement across factions.
  for (let i = 0; i < BLUE_UNITS; i += 1) {
    world.store(Orders).set(ids[i]!, { queue: [{ type: 'ATTACK', targetId: ids[i + BLUE_UNITS]! }] })
    world.store(Orders).set(ids[i + BLUE_UNITS]!, { queue: [{ type: 'ATTACK', targetId: ids[i]! }] })
  }
  return GameSession.create({ seed: 123456, identity: DEMO_IDENTITY, initialWorld: world })
}
