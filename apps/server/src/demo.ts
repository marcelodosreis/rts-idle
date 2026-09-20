import { allocateEntityId, PLAYER_IDS, START_ENTITY_ID } from '@rts/shared'
import {
  BUILDING_DEFINITIONS,
  Building,
  Cargo,
  Combat,
  createRulesIdentity,
  createWorld,
  Health,
  Kind,
  MINERAL_CARGO_CAPACITY,
  MineralNode,
  Orders,
  Owner,
  Position,
  type RulesIdentity,
  unitStatsFor
} from '@rts/simulation'
import { DEMO_SEED, scenarioById } from './demo/scenarios.js'
import { GameSession } from './sessions/session.js'

export const DEMO_IDENTITY: RulesIdentity = createRulesIdentity('demo-parallel-economy-v1', {
  mapId: 'demo',
  mapHash: 'demo'
})

/**
 * Hostile demo: enemies spawn in their own spot with combat stats and, in
 * offensive mode, march to attack the player. The player's own units (owner 0)
 * always spawn idle — they never move or attack until the player issues an
 * order. With `aggression = 'passive'`, enemies spawn without orders too and
 * never attack.
 */
export function createDemoSession(
  scenarioId: string | undefined = '6v6',
  aggression: 'offensive' | 'passive' = 'offensive'
): GameSession {
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
    if (spawn.worker === true) {
      world.store(Cargo).set(allocated.id, { amount: 0, capacity: MINERAL_CARGO_CAPACITY })
    }
    ids.push(allocated.id)
  }
  for (const base of scenario.buildings ?? []) {
    const allocated = allocateEntityId(next)
    next = allocated.nextEntityId
    world.createEntity(allocated.id)
    world.store(Position).set(allocated.id, { x: base.x, y: base.y })
    world.store(Owner).set(allocated.id, { owner: base.owner })
    world.store(Building).set(allocated.id, {
      buildingType: 'BASE',
      status: 'COMPLETED',
      progressTicks: BUILDING_DEFINITIONS.BASE.constructionTicks,
      totalTicks: BUILDING_DEFINITIONS.BASE.constructionTicks,
      builderId: null,
      footprint: { x: base.x / 256, y: base.y / 256, ...BUILDING_DEFINITIONS.BASE.footprint }
    })
  }
  for (const node of scenario.mineralNodes ?? []) {
    const allocated = allocateEntityId(next)
    next = allocated.nextEntityId
    world.createEntity(allocated.id)
    world.store(Position).set(allocated.id, { x: node.x, y: node.y })
    world.store(MineralNode).set(allocated.id, { remaining: node.remaining })
  }
  for (const [attacker, target] of scenario.attacks) {
    // The player's units start idle in interactive scenarios; cinematic
    // scenarios (playerIdle: false) let both sides fight on their own.
    if ((scenario.playerIdle !== false && scenario.spawns[attacker]!.owner === 0) || aggression === 'passive') {
      continue
    }
    world.store(Orders).set(ids[attacker]!, { queue: [{ type: 'ATTACK', targetId: ids[target]! }] })
  }
  return GameSession.create({
    seed: DEMO_SEED,
    identity: DEMO_IDENTITY,
    initialWorld: world,
    initialPlayers: PLAYER_IDS.map((id) => ({
      id,
      defeated: false,
      gold: id === 0 ? (scenario.startingGold ?? 0) : 0
    }))
  })
}
