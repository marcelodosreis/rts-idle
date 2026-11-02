import { BUILDING_STATUSES, BUILDING_TYPES, PLAYER_IDS, type PlayerId } from '@rts/shared'
import type { CanonicalReader } from '../canonical/reader.js'
import type { CanonicalWriter } from '../canonical/writer.js'
import {
  createVisionState,
  isValidVisionRadiusTiles,
  type PlayerVisionState,
  type VisionState
} from './vision-state.js'

export function writeVisionState(writer: CanonicalWriter, state: VisionState): void {
  writer.writeU32(state.radiusTiles)
  writer.writeU32(state.width)
  writer.writeU32(state.height)
  writer.writeLength(state.players.size)
  for (const playerId of PLAYER_IDS) {
    const player = state.players.get(playerId)
    if (player === undefined) {
      throw new Error(`writeVisionState: missing player ${playerId}`)
    }
    writer.writeU8(playerId)
    writeTiles(writer, player.visibleTiles)
    writeTiles(writer, player.exploredTiles)
    writeBuildings(writer, player)
    writeResources(writer, player)
  }
}

export function readVisionState(reader: CanonicalReader): VisionState {
  const radiusTiles = reader.readU32()
  const width = reader.readU32()
  const height = reader.readU32()
  if (!isValidVisionRadiusTiles(radiusTiles) || width === 0 || height === 0) {
    throw new Error('readVisionState: invalid dimensions or vision radius')
  }
  const state = createVisionState(width, height, radiusTiles)
  const count = reader.readLength()
  if (count !== PLAYER_IDS.length) {
    throw new Error(`readVisionState: expected ${PLAYER_IDS.length} players`)
  }
  const seenPlayers = new Set<PlayerId>()
  for (let index = 0; index < count; index += 1) {
    const playerId = reader.readU8()
    if (!isPlayerId(playerId) || seenPlayers.has(playerId)) {
      throw new Error(`readVisionState: invalid player ${playerId}`)
    }
    seenPlayers.add(playerId)
    const player = state.players.get(playerId)
    if (player === undefined) {
      throw new Error(`readVisionState: unknown player ${playerId}`)
    }
    readTiles(reader, player.visibleTiles)
    readTiles(reader, player.exploredTiles)
    readBuildings(reader, player)
    readResources(reader, player)
  }
  return state
}

function writeTiles(writer: CanonicalWriter, tiles: Uint8Array): void {
  writer.writeLength(tiles.length)
  for (const value of tiles) {
    writer.writeU8(value)
  }
}

function readTiles(reader: CanonicalReader, target: Uint8Array): void {
  const length = reader.readLength()
  if (length !== target.length) {
    throw new Error('readVisionState: tile length mismatch')
  }
  for (let index = 0; index < length; index += 1) {
    const value = reader.readU8()
    if (value > 1) {
      throw new Error('readVisionState: invalid tile state')
    }
    target[index] = value
  }
}

function writeBuildings(writer: CanonicalWriter, player: PlayerVisionState): void {
  const buildings = [...player.buildings.values()].sort((left, right) => left.id - right.id)
  writer.writeLength(buildings.length)
  for (const building of buildings) {
    writer.writeU32(building.id)
    writer.writeU8(BUILDING_TYPES.indexOf(building.buildingType))
    writer.writeI32(building.x)
    writer.writeI32(building.y)
    writer.writeU8(building.owner)
    writer.writeU32(building.footprint.width)
    writer.writeU32(building.footprint.height)
    writer.writeU8(BUILDING_STATUSES.indexOf(building.status))
    writer.writeU8(building.tier)
    writer.writeU32(building.lastSeenTick)
  }
}

function readBuildings(reader: CanonicalReader, player: PlayerVisionState): void {
  const count = reader.readLength()
  for (let index = 0; index < count; index += 1) {
    const id = reader.readU32()
    const buildingType = BUILDING_TYPES[reader.readU8()]
    const x = reader.readI32()
    const y = reader.readI32()
    const owner = reader.readU8()
    const width = reader.readU32()
    const height = reader.readU32()
    const status = BUILDING_STATUSES[reader.readU8()]
    const tier = reader.readU8()
    const lastSeenTick = reader.readU32()
    if (
      buildingType === undefined ||
      !isPlayerId(owner) ||
      status === undefined ||
      width === 0 ||
      height === 0 ||
      tier < 1 ||
      tier > 3 ||
      player.buildings.has(id)
    ) {
      throw new Error('readVisionState: invalid building memory')
    }
    player.buildings.set(id, {
      id,
      buildingType,
      x,
      y,
      owner,
      footprint: { width, height },
      status,
      tier,
      lastSeenTick
    })
  }
}

function writeResources(writer: CanonicalWriter, player: PlayerVisionState): void {
  const resources = [...player.resources.values()].sort((left, right) => left.resourceId - right.resourceId)
  writer.writeLength(resources.length)
  for (const resource of resources) {
    writer.writeU32(resource.resourceId)
    writer.writeI32(resource.remaining)
    writer.writeU32(resource.lastSeenTick)
  }
}

function readResources(reader: CanonicalReader, player: PlayerVisionState): void {
  const count = reader.readLength()
  for (let index = 0; index < count; index += 1) {
    const resourceId = reader.readU32()
    const remaining = reader.readI32()
    const lastSeenTick = reader.readU32()
    if (remaining < 0 || player.resources.has(resourceId)) {
      throw new Error('readVisionState: invalid resource memory')
    }
    player.resources.set(resourceId, { resourceId, remaining, lastSeenTick })
  }
}

function isPlayerId(value: number): value is PlayerId {
  return PLAYER_IDS.includes(value as PlayerId)
}
