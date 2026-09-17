import { sha256 } from '@noble/hashes/sha256'
import type { RngState } from '@rts/shared'
import { CanonicalReader, CanonicalWriter } from '../canonical/encoder.js'
import { createWorld, type World } from '../ecs/world.js'
import type { GameState } from '../state/state.js'

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
  return { tick, phase, identity, seed, rng, nextEntityId, world }
}

export function hashBytes(bytes: Uint8Array): string {
  const digest = sha256(bytes)
  return bytesToHex(digest)
}

function bytesToHex(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 1) {
    out += (bytes[i] ?? 0).toString(16).padStart(2, '0')
  }
  return out
}

export function hashState(state: GameState): string {
  return hashBytes(serializeState(state))
}
