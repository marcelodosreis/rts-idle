import type { RngState } from '@rts/shared'
import { CanonicalReader } from '../canonical/reader.js'
import { CanonicalWriter } from '../canonical/writer.js'
import { createWorld } from '../ecs/create-world.js'
import type { World } from '../ecs/world.js'
import type { GameState } from '../state/state.js'

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
  writeWorld(writer, state.world)
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
  const seed = reader.readU32()
  const rng = readRng(reader)
  const nextEntityId = reader.readU32()
  const world = readWorld(reader)
  return { tick, phase, identity, seed, rng, nextEntityId, world, events: [] }
}
