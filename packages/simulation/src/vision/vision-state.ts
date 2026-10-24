import {
  type BuildingStatus,
  type BuildingType,
  type EntityId,
  FIXED_SCALE,
  type Fixed,
  PLAYER_IDS,
  type PlayerId,
  type ResourceId
} from '@rts/shared'
import { Building } from '../ecs/building-component.js'
import { Kind, Owner, Position } from '../ecs/components.js'
import type { GameState } from '../state/state.js'

export const VISION_RADIUS_TILES = 4

export interface VisionBuildingMemory {
  readonly id: EntityId
  readonly buildingType: BuildingType
  readonly x: Fixed
  readonly y: Fixed
  readonly owner: PlayerId
  readonly footprint: { readonly width: number; readonly height: number }
  readonly status: BuildingStatus
  readonly tier: number
  readonly lastSeenTick: number
}

export interface VisionResourceMemory {
  readonly resourceId: ResourceId
  readonly remaining: number
  readonly lastSeenTick: number
}

export interface PlayerVisionState {
  readonly visibleTiles: Uint8Array
  readonly exploredTiles: Uint8Array
  readonly buildings: Map<EntityId, VisionBuildingMemory>
  readonly resources: Map<ResourceId, VisionResourceMemory>
}

export interface VisionState {
  readonly radiusTiles: number
  readonly width: number
  readonly height: number
  readonly players: Map<PlayerId, PlayerVisionState>
}

export function createVisionState(width: number, height: number): VisionState {
  const tileCount = width * height
  const players = new Map<PlayerId, PlayerVisionState>()
  for (const playerId of PLAYER_IDS) {
    players.set(playerId, {
      visibleTiles: new Uint8Array(tileCount),
      exploredTiles: new Uint8Array(tileCount),
      buildings: new Map(),
      resources: new Map()
    })
  }
  return { radiusTiles: VISION_RADIUS_TILES, width, height, players }
}

export function cloneVisionState(vision: VisionState): VisionState {
  const players = new Map<PlayerId, PlayerVisionState>()
  for (const [playerId, player] of vision.players) {
    players.set(playerId, {
      visibleTiles: player.visibleTiles.slice(),
      exploredTiles: player.exploredTiles.slice(),
      buildings: new Map([...player.buildings].map(([id, memory]) => [id, cloneBuildingMemory(memory)])),
      resources: new Map([...player.resources].map(([id, memory]) => [id, { ...memory }]))
    })
  }
  return {
    radiusTiles: vision.radiusTiles,
    width: vision.width,
    height: vision.height,
    players
  }
}

export function refreshVision(state: GameState): void {
  for (const [playerId, player] of state.vision.players) {
    player.visibleTiles.fill(0)
    revealOwnedSources(state, playerId, player)
    player.exploredTiles.forEach((_, index) => {
      if (player.visibleTiles[index] === 1) {
        player.exploredTiles[index] = 1
      }
    })
    updateBuildingMemory(state, playerId, player)
    updateResourceMemory(state, player)
  }
}

export function visionForPlayer(state: GameState, playerId: PlayerId): PlayerVisionState {
  const vision = state.vision.players.get(playerId)
  if (vision === undefined) {
    throw new Error(`visionForPlayer: unknown player ${playerId}`)
  }
  return vision
}

export function isVisibleTile(vision: PlayerVisionState, width: number, x: number, y: number): boolean {
  const index = tileIndex(width, vision.visibleTiles.length / width, x, y)
  return index !== null && vision.visibleTiles[index] === 1
}

export function visibleTileIndexes(tiles: Uint8Array): readonly number[] {
  const visible: number[] = []
  for (let index = 0; index < tiles.length; index += 1) {
    if (tiles[index] === 1) {
      visible.push(index)
    }
  }
  return visible
}

export function isEntityVisible(state: GameState, playerId: PlayerId, entityId: EntityId): boolean {
  const owner = state.world.store(Owner).get(entityId)
  if (owner?.owner === playerId) {
    return true
  }
  const position = state.world.store(Position).get(entityId)
  if (position === undefined) {
    return false
  }
  const building = state.world.store(Building).get(entityId)
  const tile = building === undefined ? tileOfFixed(position.x, position.y) : buildingCenterTile(building)
  return isVisibleTile(visionForPlayer(state, playerId), state.vision.width, tile.x, tile.y)
}

export function isResourceVisible(state: GameState, playerId: PlayerId, resourceId: ResourceId): boolean {
  const definition = state.resources.catalog.entry(resourceId)
  if (definition === undefined) {
    return false
  }
  const tile = tileOfFixed(definition.x, definition.y)
  return isVisibleTile(visionForPlayer(state, playerId), state.vision.width, tile.x, tile.y)
}

function revealOwnedSources(state: GameState, playerId: PlayerId, vision: PlayerVisionState): void {
  const owners = state.world.store(Owner)
  const positions = state.world.store(Position)
  const buildings = state.world.store(Building)
  for (const entityId of state.world.query(Kind, Owner, Position)) {
    if (owners.get(entityId)?.owner !== playerId) {
      continue
    }
    const position = positions.get(entityId)
    if (position !== undefined) {
      revealCircle(state.vision, vision, tileOfFixed(position.x, position.y))
    }
  }
  for (const entityId of state.world.query(Building, Owner, Position)) {
    if (owners.get(entityId)?.owner !== playerId) {
      continue
    }
    const building = buildings.get(entityId)
    if (building !== undefined) {
      revealCircle(state.vision, vision, buildingCenterTile(building))
    }
  }
}

function revealCircle(visionState: VisionState, vision: PlayerVisionState, center: Tile): void {
  const radius = visionState.radiusTiles
  const radiusSquared = radius * radius
  for (let y = center.y - radius; y <= center.y + radius; y += 1) {
    for (let x = center.x - radius; x <= center.x + radius; x += 1) {
      const dx = x - center.x
      const dy = y - center.y
      if (dx * dx + dy * dy <= radiusSquared) {
        const index = tileIndex(visionState.width, visionState.height, x, y)
        if (index !== null) {
          vision.visibleTiles[index] = 1
          vision.exploredTiles[index] = 1
        }
      }
    }
  }
}

function updateBuildingMemory(state: GameState, playerId: PlayerId, vision: PlayerVisionState): void {
  const buildings = state.world.store(Building)
  const positions = state.world.store(Position)
  const owners = state.world.store(Owner)
  const aliveBuildings = new Set(state.world.query(Building))
  for (const entityId of state.world.query(Building, Position, Owner)) {
    if (!isEntityVisible(state, playerId, entityId)) {
      continue
    }
    const building = buildings.get(entityId)
    const position = positions.get(entityId)
    const owner = owners.get(entityId)
    if (building === undefined || position === undefined || owner === undefined) {
      continue
    }
    vision.buildings.set(entityId, {
      id: entityId,
      buildingType: building.buildingType,
      x: position.x,
      y: position.y,
      owner: owner.owner,
      footprint: { width: building.footprint.width, height: building.footprint.height },
      status: building.status,
      tier: building.tier ?? 1,
      lastSeenTick: state.tick
    })
  }
  for (const [entityId, memory] of vision.buildings) {
    if (!aliveBuildings.has(entityId) && isVisibleMemoryTile(state, vision, memory)) {
      vision.buildings.delete(entityId)
    }
  }
}

function updateResourceMemory(state: GameState, vision: PlayerVisionState): void {
  for (const definition of state.resources.catalog.definitions()) {
    const tile = tileOfFixed(definition.x, definition.y)
    if (!isVisibleTile(vision, state.vision.width, tile.x, tile.y)) {
      continue
    }
    vision.resources.set(definition.resourceId, {
      resourceId: definition.resourceId,
      remaining: state.resources.amount(definition.resourceId) ?? 0,
      lastSeenTick: state.tick
    })
  }
}

function isVisibleMemoryTile(state: GameState, vision: PlayerVisionState, memory: VisionBuildingMemory): boolean {
  const tile = {
    x: Math.floor(memory.x / FIXED_SCALE + memory.footprint.width / 2),
    y: Math.floor(memory.y / FIXED_SCALE + memory.footprint.height / 2)
  }
  return isVisibleTile(vision, state.vision.width, tile.x, tile.y)
}

function buildingCenterTile(building: {
  readonly footprint: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
}): Tile {
  return {
    x: Math.floor(building.footprint.x + building.footprint.width / 2),
    y: Math.floor(building.footprint.y + building.footprint.height / 2)
  }
}

export function tileOfFixed(x: Fixed, y: Fixed): Tile {
  return { x: Math.floor(x / FIXED_SCALE), y: Math.floor(y / FIXED_SCALE) }
}

function tileIndex(width: number, height: number, x: number, y: number): number | null {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return null
  }
  return y * width + x
}

function cloneBuildingMemory(memory: VisionBuildingMemory): VisionBuildingMemory {
  return { ...memory, footprint: { ...memory.footprint } }
}

interface Tile {
  readonly x: number
  readonly y: number
}
