import { allocateEntityId, type MapDefinition, PLAYER_IDS, placementBoundsFromMap, START_ENTITY_ID } from '@rts/shared'
import {
  BUILDING_DEFINITIONS,
  Building,
  Cargo,
  Combat,
  createWorld,
  Health,
  Kind,
  MINERAL_CARGO_CAPACITY,
  MineralNode,
  Orders,
  Owner,
  Position,
  type RulesIdentity,
  unitStatsFor,
  type World
} from '@rts/simulation'
import { GameSession } from '../../sessions/session.js'
import {
  DEMO_SEED,
  type DemoBaseSpawn,
  type DemoMineralNodeSpawn,
  type DemoScenario,
  type DemoSpawn,
  scenarioById
} from './scenarios.js'

interface SeedContext {
  readonly world: World
  next: number
  readonly ids: number[]
}

/** Allocates an entity, advances the id cursor, and returns the new id. */
function allocate(context: SeedContext): number {
  const allocated = allocateEntityId(context.next)
  context.next = allocated.nextEntityId
  context.world.createEntity(allocated.id)
  return allocated.id
}

function seedUnit(context: SeedContext, spawn: DemoSpawn): void {
  const stats = unitStatsFor(spawn.kind)
  const id = allocate(context)
  context.world.store(Position).set(id, { x: spawn.x, y: spawn.y })
  context.world.store(Owner).set(id, { owner: spawn.owner })
  context.world.store(Kind).set(id, spawn.kind)
  context.world.store(Health).set(id, { current: stats.maxHp, max: stats.maxHp })
  context.world.store(Combat).set(id, {
    damage: stats.damage,
    rangeTiles: stats.rangeTiles,
    cooldownTicks: stats.cooldownTicks,
    cooldownRemaining: 0
  })
  if (spawn.worker === true) {
    context.world.store(Cargo).set(id, { amount: 0, capacity: MINERAL_CARGO_CAPACITY })
  }
  context.ids.push(id)
}

function seedUnits(context: SeedContext, spawns: readonly DemoSpawn[]): void {
  for (const spawn of spawns) {
    seedUnit(context, spawn)
  }
}

function seedBuildings(context: SeedContext, buildings: readonly DemoBaseSpawn[]): void {
  for (const base of buildings) {
    const id = allocate(context)
    context.world.store(Position).set(id, { x: base.x, y: base.y })
    context.world.store(Owner).set(id, { owner: base.owner })
    context.world.store(Building).set(id, {
      buildingType: 'BASE',
      status: 'COMPLETED',
      progressTicks: BUILDING_DEFINITIONS.BASE.constructionTicks,
      totalTicks: BUILDING_DEFINITIONS.BASE.constructionTicks,
      builderId: null,
      footprint: { x: base.x / 256, y: base.y / 256, ...BUILDING_DEFINITIONS.BASE.footprint }
    })
  }
}

function seedMineralNodes(context: SeedContext, nodes: readonly DemoMineralNodeSpawn[]): void {
  for (const node of nodes) {
    const id = allocate(context)
    context.world.store(Position).set(id, { x: node.x, y: node.y })
    context.world.store(MineralNode).set(id, { remaining: node.remaining })
  }
}

function seedAttacks(context: SeedContext, scenario: DemoScenario, aggression: 'offensive' | 'passive'): void {
  for (const [attacker, target] of scenario.attacks) {
    // The player's units start idle in interactive scenarios; cinematic
    // scenarios (playerIdle: false) let both sides fight on their own.
    if ((scenario.playerIdle !== false && scenario.spawns[attacker]!.owner === 0) || aggression === 'passive') {
      continue
    }
    context.world
      .store(Orders)
      .set(context.ids[attacker]!, { queue: [{ type: 'ATTACK', targetId: context.ids[target]! }] })
  }
}

/**
 * Hostile demo: enemies spawn in their own spot with combat stats and, in
 * offensive mode, march to attack the player. The player's own units (owner 0)
 * always spawn idle — they never move or attack until the player issues an
 * order. With `aggression = 'passive'`, enemies spawn without orders too and
 * never attack.
 */
export function createDemoSession(
  scenarioId: string,
  aggression: 'offensive' | 'passive',
  map: MapDefinition,
  identity: RulesIdentity
): GameSession {
  const scenario = scenarioById(scenarioId)
  const context: SeedContext = { world: createWorld(), next: START_ENTITY_ID, ids: [] }
  seedUnits(context, scenario.spawns)
  seedBuildings(context, scenario.buildings ?? [])
  seedMineralNodes(context, scenario.mineralNodes ?? [])
  seedAttacks(context, scenario, aggression)
  return GameSession.create({
    seed: DEMO_SEED,
    identity,
    mapBounds: placementBoundsFromMap(map),
    initialWorld: context.world,
    initialPlayers: PLAYER_IDS.map((id) => ({
      id,
      defeated: false,
      gold: id === 0 ? (scenario.startingGold ?? 0) : 0
    }))
  })
}
