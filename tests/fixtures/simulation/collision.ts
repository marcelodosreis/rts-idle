import { BUILDING_DEFINITIONS } from '@rts/game-data'
import { type EntityId, type PlayerId, START_ENTITY_ID, tilesToFixed } from '@rts/shared'
import {
  Building,
  createSimulation,
  createWorld,
  Health,
  Kind,
  Owner,
  Position,
  type ScheduledCommand,
  type SimulationHost,
  type World
} from '@rts/simulation'
import { TEST_IDENTITY } from './identity.js'

export const COLLISION_MAP_BOUNDS = Object.freeze({ width: 16, height: 16 })
export const COLLISION_UNIT_ID = START_ENTITY_ID
export const COLLISION_OPPONENT_ID = START_ENTITY_ID + 1
export const COLLISION_BUILDING_ID = START_ENTITY_ID + 2

const COLLISION_PLAYERS: readonly PlayerId[] = [0, 1, 2, 3]

export interface CollisionSimulationOptions {
  readonly unitPosition?: { readonly x: number; readonly y: number }
}

function addUnit(
  world: World,
  id: EntityId,
  owner: PlayerId,
  position: { readonly x: number; readonly y: number }
): void {
  world.createEntity(id)
  world.store(Position).set(id, position)
  world.store(Owner).set(id, { owner })
  world.store(Kind).set(id, 'pawn')
}

export function createCollisionSimulation(options: CollisionSimulationOptions = {}): SimulationHost {
  const world = createWorld()
  addUnit(world, COLLISION_UNIT_ID, 0, options.unitPosition ?? { x: 0, y: tilesToFixed(2) })
  addUnit(world, COLLISION_OPPONENT_ID, 1, { x: tilesToFixed(15), y: tilesToFixed(15) })
  world.createEntity(COLLISION_BUILDING_ID)
  world.store(Position).set(COLLISION_BUILDING_ID, { x: tilesToFixed(4), y: tilesToFixed(1) })
  world.store(Owner).set(COLLISION_BUILDING_ID, { owner: 1 })
  world.store(Building).set(COLLISION_BUILDING_ID, {
    buildingType: 'HOUSE',
    status: 'COMPLETED',
    progressTicks: 100,
    totalTicks: 100,
    builderId: null,
    footprint: { x: 4, y: 1, width: 2, height: 3 },
    rallyPoint: null
  })
  world.store(Health).set(COLLISION_BUILDING_ID, {
    current: BUILDING_DEFINITIONS.HOUSE.maxHp,
    max: BUILDING_DEFINITIONS.HOUSE.maxHp
  })
  return createSimulation({
    seed: 7,
    identity: TEST_IDENTITY,
    initialWorld: world,
    mapBounds: COLLISION_MAP_BOUNDS,
    initialPlayers: COLLISION_PLAYERS.map((id) => ({
      id,
      defeated: false,
      resources: { GOLD: id === 0 ? 100 : 0, WOOD: 0 }
    }))
  })
}

export function moveCollisionUnit(targetX: number, targetY: number): ScheduledCommand {
  return {
    tick: 1,
    playerId: 0,
    sequence: 1,
    intent: {
      type: 'MOVE',
      payload: { unitIds: [COLLISION_UNIT_ID], x: targetX, y: targetY }
    }
  }
}
