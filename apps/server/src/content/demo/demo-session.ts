import { allocateEntityId, type MapDefinition, PLAYER_IDS, placementBoundsFromMap, START_ENTITY_ID } from '@rts/shared'
import {
  BUILDING_DEFINITIONS,
  Building,
  createUnitEntity,
  createWorld,
  Health,
  Orders,
  Owner,
  Position,
  Production,
  type RulesIdentity,
  type World
} from '@rts/simulation'
import { GameSession } from '../../sessions/session.js'
import { DEMO_SEED, type DemoBaseSpawn, type DemoScenario, type DemoSpawn, scenarioById } from './scenarios.js'

interface SeedContext {
  readonly world: World
  next: number
  readonly ids: number[]
}

/** Allocates an entity, advances the id cursor, and returns the new id. */
function allocate(context: SeedContext): number {
  const allocated = allocateEntityId(context.next)
  context.next = allocated.nextEntityId
  return allocated.id
}

function seedUnit(context: SeedContext, spawn: DemoSpawn): void {
  const id = allocate(context)
  createUnitEntity(context.world, {
    id,
    x: spawn.x,
    y: spawn.y,
    owner: spawn.owner,
    kind: spawn.kind,
    worker: spawn.worker === true
  })
  if (spawn.initialHp !== undefined) {
    const health = context.world.store(Health).get(id)
    if (health === undefined || spawn.initialHp < 0 || spawn.initialHp > health.max) {
      throw new Error(`DemoSession: invalid initial HP for unit ${id}`)
    }
    context.world.store(Health).set(id, { current: spawn.initialHp, max: health.max })
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
    const buildingType = base.buildingType ?? 'CASTLE'
    const definition = BUILDING_DEFINITIONS[buildingType]
    const id = allocate(context)
    context.world.createEntity(id)
    context.world.store(Position).set(id, { x: base.x, y: base.y })
    context.world.store(Owner).set(id, { owner: base.owner })
    context.world.store(Building).set(id, {
      buildingType,
      status: 'COMPLETED',
      progressTicks: definition.constructionTicks,
      totalTicks: definition.constructionTicks,
      builderId: null,
      ...(base.tier === undefined ? {} : { tier: base.tier }),
      footprint: {
        x: base.x / 256,
        y: base.y / 256,
        ...definition.footprint
      },
      rallyPoint: null
    })
    if (buildingType === 'MONASTERY') {
      context.world.store(Production).set(id, { queue: [] })
    }
    const maxHp = definition.maxHp
    context.world.store(Health).set(id, { current: base.initialHp ?? maxHp, max: maxHp })
  }
}

function seedAttacks(context: SeedContext, scenario: DemoScenario, aggression: 'offensive' | 'passive'): void {
  for (const [attacker, target] of scenario.attacks) {
    // The player's units start idle in interactive scenarios; only enemy
    // orders are seeded when aggression is offensive.
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
  seedAttacks(context, scenario, aggression)
  return GameSession.create({
    seed: DEMO_SEED,
    identity,
    mapBounds: placementBoundsFromMap(map),
    resources: map.resources,
    initialWorld: context.world,
    initialPlayers: PLAYER_IDS.map((id) => ({
      id,
      defeated: false,
      resources: { GOLD: id === 0 ? (scenario.startingGold ?? 0) : 0, WOOD: 0 },
      completedResearch: [],
      highestCastleTierReached: scenario.startingCastleTier ?? 1
    }))
  })
}
