import { createPlayerResources, type EntityId, type PlayerId, type SimulationEvent } from '@rts/shared'
import type { GameState } from '../state/state.js'
import {
  isEntityVisible,
  type VisionBuildingMemory,
  visibleTileIndexes,
  visionForPlayer
} from '../vision/vision-state.js'
import type { ObservationBuilding, ObservationFog, SimulationObservation } from './observation.js'
import { createSimulationObservation } from './observation.js'

/** Projects only the state that one player is allowed to observe. */
export function createPlayerObservation(
  state: GameState,
  playerId: PlayerId,
  completeResources: boolean,
  entityIds?: readonly EntityId[]
): SimulationObservation {
  const full = createSimulationObservation(state, completeResources, entityIds)
  const vision = visionForPlayer(state, playerId)
  const visibleUnits = full.units.filter((unit) => unit.owner === playerId || isEntityVisible(state, playerId, unit.id))
  const visibleBuildings = full.buildings.filter((building) => isEntityVisible(state, playerId, building.id))
  const knownBuildingIds = new Set(visibleBuildings.map((building) => building.id))
  const memoryBuildings = [...vision.buildings.values()]
    .filter((memory) => !knownBuildingIds.has(memory.id) && isRequestedEntity(memory.id, entityIds))
    .map(memoryBuilding)
  const players = full.players.map((player) => (player.id === playerId ? player : hiddenPlayer(player)))
  return {
    tick: full.tick,
    phase: full.phase,
    units: visibleUnits,
    buildings: [...visibleBuildings, ...memoryBuildings].sort((left, right) => left.id - right.id),
    players,
    resources: [...vision.resources.values()]
      .sort((left, right) => left.resourceId - right.resourceId)
      .map(({ resourceId, remaining }) => ({ resourceId, remaining })),
    resourcesComplete: completeResources,
    fog: fogForPlayer(state, vision)
  }
}

export function filterEvents(
  state: GameState,
  playerId: PlayerId,
  events: readonly SimulationEvent[]
): readonly SimulationEvent[] {
  return events.filter((event) => eventEntityIds(event).every((id) => isEntityVisible(state, playerId, id)))
}

function fogForPlayer(state: GameState, vision: ReturnType<typeof visionForPlayer>): ObservationFog {
  return {
    width: state.vision.width,
    height: state.vision.height,
    visibleTiles: visibleTileIndexes(vision.visibleTiles),
    exploredTiles: visibleTileIndexes(vision.exploredTiles)
  }
}

function memoryBuilding(memory: VisionBuildingMemory): ObservationBuilding {
  return {
    id: memory.id,
    buildingType: memory.buildingType,
    x: memory.x,
    y: memory.y,
    owner: memory.owner,
    builderId: null,
    footprint: { ...memory.footprint },
    status: memory.status,
    tier: memory.tier,
    tierUpgrade: null,
    progressTicks: 0,
    totalTicks: 1,
    rallyPoint: null,
    lastSeenTick: memory.lastSeenTick
  }
}

function hiddenPlayer(player: SimulationObservation['players'][number]): SimulationObservation['players'][number] {
  return {
    ...player,
    resources: createPlayerResources(),
    usedSupply: 0,
    reservedSupply: 0,
    supplyCap: 0,
    completedResearch: [],
    queuedResearch: []
  }
}

function isRequestedEntity(id: EntityId, entityIds: readonly EntityId[] | undefined): boolean {
  return entityIds === undefined || entityIds.includes(id)
}

function eventEntityIds(event: SimulationEvent): readonly EntityId[] {
  switch (event.type) {
    case 'attackFired':
      return [event.attackerId, event.targetId]
    case 'damageDealt':
      return [event.targetId]
    case 'healCast':
      return [event.healerId, event.targetId]
    case 'repairStopped':
      return [event.workerId, event.targetId]
    case 'unitDied':
      return [event.entityId]
    case 'movementBlocked':
      return [event.unitId]
    default:
      return []
  }
}
