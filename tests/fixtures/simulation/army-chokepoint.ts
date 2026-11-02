import { BUILDING_FOOTPRINTS, unitDefinitionFor } from '@rts/game-data'
import {
  allocateEntityId,
  type EntityId,
  type PlayerId,
  START_ENTITY_ID,
  tilesToFixed,
  type UnitKind
} from '@rts/shared'
import {
  AbilityCooldown,
  Building,
  Combat,
  createSimulation,
  createWorld,
  Health,
  Kind,
  Orders,
  Owner,
  Position,
  type ScheduledCommand,
  type SimulationHost
} from '@rts/simulation'
import { SEEDS } from '../seeds.js'
import { TEST_IDENTITY } from './identity.js'

const MAP_SIZE = 32
const CHANNEL_TILES = { left: 14, top: 14, right: 17, bottom: 17 }
const WALL_TILES: readonly { readonly x: number; readonly y: number }[] = [
  { x: 18, y: 8 },
  { x: 18, y: 11 }
]
const KINDS: readonly UnitKind[] = ['archer', 'warrior', 'lancer', 'pawn', 'archer', 'warrior', 'monk', 'pawn']
const MONK_INDEX = 6
const PLAYER_ORIGIN = { x: 9, y: 9 }
const ENEMY_ORIGIN = { x: 22, y: 19 }
const ATTACK_MOVE_PLAYER = { x: tilesToFixed(22), y: tilesToFixed(20) }
const ATTACK_MOVE_ENEMY = { x: tilesToFixed(10), y: tilesToFixed(10) }
const CAST_TICKS: readonly { readonly tick: number; readonly archerIndex: number }[] = [
  { tick: 300, archerIndex: 0 },
  { tick: 320, archerIndex: 1 }
]

export interface ArmyChokepointFixture {
  readonly simulation: SimulationHost
  readonly playerUnits: readonly EntityId[]
  readonly enemyUnits: readonly EntityId[]
  readonly playerAttackers: readonly EntityId[]
  readonly enemyAttackers: readonly EntityId[]
  readonly playerMonk: EntityId
  readonly enemyMonk: EntityId
  readonly archers: readonly EntityId[]
  readonly enemyBuildings: readonly EntityId[]
  readonly enemyTarget: EntityId
  readonly invalidTiles: readonly { readonly x: number; readonly y: number }[]
}

function obstacleTiles(): readonly { readonly x: number; readonly y: number }[] {
  const tiles: { x: number; y: number }[] = []
  for (let y = 0; y < MAP_SIZE; y += 1) {
    for (let x = 0; x < MAP_SIZE; x += 1) {
      const onBorder = x < 4 || x >= MAP_SIZE - 4 || y < 4 || y >= MAP_SIZE - 4
      const channel =
        x >= CHANNEL_TILES.left && x <= CHANNEL_TILES.right && y >= CHANNEL_TILES.top && y <= CHANNEL_TILES.bottom
      if (onBorder || channel) {
        tiles.push({ x, y })
      }
    }
  }
  return tiles
}

function armyPositions(origin: { readonly x: number; readonly y: number }): readonly {
  readonly x: number
  readonly y: number
}[] {
  return KINDS.map((_, index) => ({
    x: tilesToFixed(origin.x + (index % 4)),
    y: tilesToFixed(origin.y + Math.floor(index / 4))
  }))
}

export function createArmyChokepointFixture(): ArmyChokepointFixture {
  const world = createWorld()
  let next = START_ENTITY_ID
  const spawnUnit = (owner: PlayerId, kind: UnitKind, position: { readonly x: number; readonly y: number }) => {
    const allocated = allocateEntityId(next)
    next = allocated.nextEntityId
    world.createEntity(allocated.id)
    const definition = unitDefinitionFor(kind)
    world.store(Position).set(allocated.id, position)
    world.store(Owner).set(allocated.id, { owner })
    world.store(Kind).set(allocated.id, kind)
    world.store(Health).set(allocated.id, { current: definition.maxHp, max: definition.maxHp })
    world.store(Combat).set(allocated.id, {
      armor: definition.armor,
      damage: definition.damage,
      rangeTiles: definition.rangeTiles,
      cooldownTicks: definition.cooldownTicks,
      cooldownRemaining: 0
    })
    world.store(AbilityCooldown).set(allocated.id, { healCooldownRemaining: 0, explosiveShotCooldownRemaining: 0 })
    world.store(Orders).set(allocated.id, { queue: [] })
    return allocated.id
  }
  const playerUnits = KINDS.map((kind, index) => spawnUnit(0, kind, armyPositions(PLAYER_ORIGIN)[index]!))
  const enemyUnits = KINDS.map((kind, index) => spawnUnit(1, kind, armyPositions(ENEMY_ORIGIN)[index]!))
  const footprint = BUILDING_FOOTPRINTS.HOUSE
  const enemyBuildings = WALL_TILES.map((tile) => {
    const allocated = allocateEntityId(next)
    next = allocated.nextEntityId
    world.createEntity(allocated.id)
    world.store(Position).set(allocated.id, { x: tilesToFixed(tile.x), y: tilesToFixed(tile.y) })
    world.store(Owner).set(allocated.id, { owner: 1 })
    world.store(Health).set(allocated.id, { current: 100, max: 250 })
    world.store(Building).set(allocated.id, {
      buildingType: 'HOUSE',
      status: 'COMPLETED',
      progressTicks: 1,
      totalTicks: 1,
      builderId: null,
      footprint: { x: tile.x, y: tile.y, width: footprint.width, height: footprint.height }
    })
    return allocated.id
  })
  const players = [0, 1, 2, 3].map((id) => ({
    id: id as PlayerId,
    defeated: false,
    resources: { GOLD: id === 0 ? 100 : 0, WOOD: 0 },
    completedResearch: [] as const
  }))
  const invalidTiles = obstacleTiles()
  const simulation = createSimulation({
    seed: SEEDS.simulation.fixedTick,
    identity: TEST_IDENTITY,
    initialWorld: world,
    initialPlayers: [...players],
    mapBounds: { width: MAP_SIZE, height: MAP_SIZE, invalidTiles }
  })
  return {
    simulation,
    playerUnits,
    enemyUnits,
    playerAttackers: playerUnits.filter((_, index) => index !== MONK_INDEX),
    enemyAttackers: enemyUnits.filter((_, index) => index !== MONK_INDEX),
    playerMonk: playerUnits[MONK_INDEX]!,
    enemyMonk: enemyUnits[MONK_INDEX]!,
    archers: [playerUnits[0]!, playerUnits[4]!],
    enemyBuildings,
    enemyTarget: enemyUnits[2]!,
    invalidTiles
  }
}

function attackMove(
  tick: number,
  playerId: PlayerId,
  unitIds: readonly EntityId[],
  point: { readonly x: number; readonly y: number }
) {
  return {
    tick,
    playerId,
    sequence: 1,
    intent: { type: 'ATTACK_MOVE' as const, payload: { unitIds, x: point.x, y: point.y } }
  }
}

function move(tick: number, playerId: PlayerId, unitId: EntityId, point: { readonly x: number; readonly y: number }) {
  return {
    tick,
    playerId,
    sequence: 1,
    intent: { type: 'MOVE' as const, payload: { unitIds: [unitId], x: point.x, y: point.y } }
  }
}

/** Deterministic authored command trace for the stress fixture. */
export function armyChokepointCommands(tick: number, fixture: ArmyChokepointFixture): readonly ScheduledCommand[] {
  if (tick === 1) {
    return [
      attackMove(1, 0, fixture.playerAttackers, ATTACK_MOVE_PLAYER),
      move(1, 0, fixture.playerMonk, ATTACK_MOVE_PLAYER),
      attackMove(1, 1, fixture.enemyAttackers, ATTACK_MOVE_ENEMY),
      move(1, 1, fixture.enemyMonk, ATTACK_MOVE_ENEMY)
    ]
  }
  const cast = CAST_TICKS.find((entry) => entry.tick === tick)
  if (cast !== undefined) {
    return [
      {
        tick,
        playerId: 0,
        sequence: 2,
        intent: {
          type: 'EXPLOSIVE_SHOT',
          payload: { unitIds: [fixture.archers[cast.archerIndex]!], targetId: fixture.enemyTarget }
        }
      }
    ]
  }
  return []
}
