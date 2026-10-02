import {
  type PlayerId,
  RESEARCH_TYPES,
  RESOURCE_KINDS,
  type ResearchType,
  type ResourceDefinition,
  type RngState
} from '@rts/shared'
import { CanonicalReader } from '../canonical/reader.js'
import { readPlayerResources, writePlayerResources } from '../canonical/resource-codecs.js'
import { CanonicalWriter } from '../canonical/writer.js'
import { SIMULATION_VERSION } from '../contracts/simulation-version.js'
import { MAX_SUPPLY_CAPACITY } from '../data/supply-rules.js'
import { createWorld } from '../ecs/create-world.js'
import type { World } from '../ecs/world.js'
import { ResourceCatalog } from '../resources/resource-catalog.js'
import { ResourceState } from '../resources/resource-state.js'
import type { GameState, PlayerState } from '../state/state.js'
import { compareScheduledCommands, decodeScheduledCommand, encodeScheduledCommand } from './commands.js'

/**
 * Canonical state serialization (ADR-002/011): explicit schema order, integers
 * with a defined representation, entities by id, components in registration
 * order, and a presence flag so "component absent" is distinct from a zero
 * value. The byte layout is pinned by the golden-hash test.
 */

function writeRng(writer: CanonicalWriter, rng: RngState): void {
  writer.writeU32(rng.s0)
  writer.writeU32(rng.s1)
  writer.writeU32(rng.s2)
  writer.writeU32(rng.s3)
}

function readRng(reader: CanonicalReader): RngState {
  return {
    s0: reader.readU32(),
    s1: reader.readU32(),
    s2: reader.readU32(),
    s3: reader.readU32()
  }
}

function writeWorld(writer: CanonicalWriter, world: World): void {
  const ids = world.aliveIds()
  writer.writeLength(ids.length)
  for (const id of ids) {
    writer.writeU32(id)
    for (const type of world.componentTypes()) {
      const value = world.store(type).get(id)
      if (value === undefined) {
        // Presence flag 0: component absent (distinct from a zero value).
        writer.writeU8(0)
      } else {
        writer.writeU8(1)
        type.encode(writer, value)
      }
    }
  }
}

function readWorld(reader: CanonicalReader): World {
  const world = createWorld()
  const count = reader.readLength()
  for (let i = 0; i < count; i += 1) {
    const id = reader.readU32()
    world.createEntity(id)
    for (const type of world.componentTypes()) {
      const present = reader.readU8()
      if (present === 1) {
        world.store(type).set(id, type.decode(reader))
      }
    }
  }
  return world
}

function writePlayers(writer: CanonicalWriter, players: readonly PlayerState[]): void {
  writer.writeLength(players.length)
  for (const player of players) {
    writer.writeU8(player.id)
    writer.writeU8(player.defeated ? 1 : 0)
    writePlayerResources(writer, player.resources)
    writer.writeI32(player.usedSupply)
    writer.writeI32(player.reservedSupply)
    writer.writeI32(player.supplyCap)
    writer.writeU8(player.highestCastleTierReached)
    writer.writeLength(player.completedResearch.length)
    for (const researchType of player.completedResearch) {
      writer.writeU8(RESEARCH_TYPES.indexOf(researchType))
    }
  }
}

function researchTypeFromTag(tag: number): ResearchType {
  const researchType = RESEARCH_TYPES[tag]
  if (researchType === undefined) {
    throw new Error(`readPlayers: invalid research tag ${tag}`)
  }
  return researchType
}

function writeMapBounds(writer: CanonicalWriter, bounds: GameState['mapBounds']): void {
  writer.writeU32(bounds.width)
  writer.writeU32(bounds.height)
  writer.writeLength(bounds.invalidTiles?.length ?? 0)
  for (const tile of bounds.invalidTiles ?? []) {
    writer.writeU32(tile.x)
    writer.writeU32(tile.y)
  }
}

function readMapBounds(reader: CanonicalReader): GameState['mapBounds'] {
  const width = reader.readU32()
  const height = reader.readU32()
  const count = reader.readLength()
  const invalidTiles = []
  for (let i = 0; i < count; i += 1) {
    invalidTiles.push({ x: reader.readU32(), y: reader.readU32() })
  }
  return invalidTiles.length === 0 ? { width, height } : { width, height, invalidTiles }
}

function readPlayers(reader: CanonicalReader): PlayerState[] {
  const count = reader.readLength()
  const players: PlayerState[] = []
  for (let i = 0; i < count; i += 1) {
    const slot = reader.readU8()
    // Only the four competitive slots are valid; the guard below narrows the
    // slot to PlayerId (0-3) so the cast is safe.
    if (slot > 3) {
      throw new Error(`readPlayers: invalid player slot ${slot}`)
    }
    const id = slot as PlayerId
    const defeated = reader.readU8() === 1
    const resources = readPlayerResources(reader)
    const usedSupply = reader.readI32()
    const reservedSupply = reader.readI32()
    const supplyCap = reader.readI32()
    if (usedSupply < 0 || reservedSupply < 0 || supplyCap < 0 || supplyCap > MAX_SUPPLY_CAPACITY) {
      throw new Error(`readPlayers: invalid supply ${usedSupply}+${reservedSupply}/${supplyCap}`)
    }
    const highestCastleTierReached = reader.readU8()
    if (highestCastleTierReached < 1 || highestCastleTierReached > 3) {
      throw new Error(`readPlayers: invalid Castle tier ${highestCastleTierReached}`)
    }
    const researchCount = reader.readLength()
    const completedResearch: ResearchType[] = []
    for (let researchIndex = 0; researchIndex < researchCount; researchIndex += 1) {
      completedResearch.push(researchTypeFromTag(reader.readU8()))
    }
    players.push({
      id,
      defeated,
      resources,
      usedSupply,
      reservedSupply,
      supplyCap,
      completedResearch,
      highestCastleTierReached: highestCastleTierReached as 1 | 2 | 3
    })
  }
  return players
}

function writeResources(writer: CanonicalWriter, state: ResourceState): void {
  const definitions = state.catalog.definitions()
  writer.writeLength(definitions.length)
  for (const [index, definition] of definitions.entries()) {
    writer.writeU32(definition.resourceId)
    writer.writeU8(RESOURCE_KINDS.indexOf(definition.kind))
    writer.writeI32(definition.x)
    writer.writeI32(definition.y)
    writer.writeI32(definition.variant)
    writer.writeI32(definition.initialAmount)
    writer.writeI32(definition.harvestAmount)
    writer.writeI32(definition.harvestTicks)
    writer.writeU8(definition.blocksNavigation ? 1 : 0)
    writer.writeI32(state.remaining[index]!)
  }
}

function readResources(reader: CanonicalReader): ResourceState {
  const definitions: ResourceDefinition[] = []
  const remaining: number[] = []
  const count = reader.readLength()
  for (let index = 0; index < count; index += 1) {
    const resourceId = reader.readU32()
    const kind = RESOURCE_KINDS[reader.readU8()]
    const x = reader.readI32()
    const y = reader.readI32()
    const variant = reader.readI32()
    const initialAmount = reader.readI32()
    const harvestAmount = reader.readI32()
    const harvestTicks = reader.readI32()
    const blocksNavigation = reader.readU8()
    const amount = reader.readI32()
    if (
      kind === undefined ||
      (blocksNavigation !== 0 && blocksNavigation !== 1) ||
      initialAmount < harvestAmount ||
      harvestAmount <= 0 ||
      harvestTicks <= 0 ||
      amount < 0 ||
      amount > initialAmount
    ) {
      throw new Error('readResources: invalid resource state')
    }
    definitions.push({
      resourceId,
      kind,
      x,
      y,
      variant,
      initialAmount,
      harvestAmount,
      harvestTicks,
      blocksNavigation: blocksNavigation === 1
    })
    remaining.push(amount)
  }
  return new ResourceState(new ResourceCatalog(definitions), Int32Array.from(remaining))
}

function writePendingCommands(
  writer: CanonicalWriter,
  commands: readonly GameState['pendingCommands'][number][]
): void {
  const ordered = [...commands].sort(compareScheduledCommands)
  writer.writeLength(ordered.length)
  for (const command of ordered) {
    encodeScheduledCommand(writer, command)
  }
}

function readPendingCommands(reader: CanonicalReader): GameState['pendingCommands'] {
  const commands = Array.from({ length: reader.readLength() }, () => decodeScheduledCommand(reader))
  return commands.sort(compareScheduledCommands)
}

export function serializeState(state: GameState): Uint8Array {
  const writer = new CanonicalWriter()
  writer.writeU32(state.tick)
  writer.writeString(state.phase)
  writer.writeString(state.identity.simulationVersion)
  writer.writeString(state.identity.rulesetVersion)
  writer.writeString(state.identity.rulesetHash)
  writer.writeString(state.identity.mapId)
  writer.writeString(state.identity.mapHash)
  writer.writeU32(state.seed)
  writeRng(writer, state.rng)
  writer.writeU32(state.nextEntityId)
  writeMapBounds(writer, state.mapBounds)
  writePlayers(writer, state.players)
  writeResources(writer, state.resources)
  writeWorld(writer, state.world)
  writePendingCommands(writer, state.pendingCommands)
  return writer.toBytes()
}

export function deserializeState(bytes: Uint8Array): GameState {
  const reader = new CanonicalReader(bytes)
  const tick = reader.readU32()
  const phase = reader.readString()
  if (phase !== 'RUNNING' && phase !== 'FINISHED') {
    throw new Error(`deserializeState: invalid phase ${phase}`)
  }
  const identity = {
    simulationVersion: reader.readString(),
    rulesetVersion: reader.readString(),
    rulesetHash: reader.readString(),
    mapId: reader.readString(),
    mapHash: reader.readString()
  }
  if (identity.simulationVersion !== SIMULATION_VERSION) {
    throw new Error(`deserializeState: unsupported simulation version ${identity.simulationVersion}`)
  }
  const seed = reader.readU32()
  const rng = readRng(reader)
  const nextEntityId = reader.readU32()
  const mapBounds = readMapBounds(reader)
  const players = readPlayers(reader)
  const resources = readResources(reader)
  const world = readWorld(reader)
  const pendingCommands = readPendingCommands(reader)
  reader.assertEOF()
  return {
    tick,
    phase,
    identity,
    seed,
    rng,
    nextEntityId,
    mapBounds,
    players,
    world,
    resources,
    events: [],
    pendingDamage: new Map(),
    pendingCommands
  }
}
