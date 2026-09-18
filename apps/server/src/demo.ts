import { allocateEntityId, START_ENTITY_ID } from '@rts/shared'
import {
  Combat,
  createRulesIdentity,
  createWorld,
  Health,
  Kind,
  Orders,
  Owner,
  Position,
  type RulesIdentity,
  unitStatsFor
} from '@rts/simulation'
import { scenarioById } from './demo/scenarios.js'
import { GameSession } from './sessions/session.js'

export const DEMO_IDENTITY: RulesIdentity = createRulesIdentity('demo')

/**
 * Hostile demo: each faction spawns in its own spot with combat stats and
 * mutual ATTACK orders, so the squads march toward one another and fight where
 * they meet. The player is player 0 and can override the standing ATTACK
 * orders with any command (MOVE replaces them, STOP/HOLD cancel, etc.).
 */
export function createDemoSession(scenarioId: string | undefined = '2v2'): GameSession {
  const scenario = scenarioById(scenarioId)
  const world = createWorld()
  let next = START_ENTITY_ID
  const ids: number[] = []
  for (const spawn of scenario.spawns) {
    const allocated = allocateEntityId(next)
    next = allocated.nextEntityId
    const stats = unitStatsFor(spawn.kind)
    world.createEntity(allocated.id)
    world.store(Position).set(allocated.id, { x: spawn.x, y: spawn.y })
    world.store(Owner).set(allocated.id, { owner: spawn.owner })
    world.store(Kind).set(allocated.id, spawn.kind)
    world.store(Health).set(allocated.id, { current: stats.maxHp, max: stats.maxHp })
    world.store(Combat).set(allocated.id, {
      damage: stats.damage,
      rangeTiles: stats.rangeTiles,
      cooldownTicks: stats.cooldownTicks,
      cooldownRemaining: 0
    })
    ids.push(allocated.id)
  }
  for (const [attacker, target] of scenario.attacks) {
    world.store(Orders).set(ids[attacker]!, { queue: [{ type: 'ATTACK', targetId: ids[target]! }] })
  }
  return GameSession.create({ seed: 123456, identity: DEMO_IDENTITY, initialWorld: world })
}
