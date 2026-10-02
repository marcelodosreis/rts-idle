import type { PlayerId } from '@rts/shared'
import {
  assertNever,
  BUILDING_TYPES,
  COMMAND_TYPES,
  type CommandIntent,
  type EntityId,
  RESEARCH_TYPES,
  type ResearchType,
  TRAINABLE_UNIT_KINDS,
  type TrainableUnitKind
} from '@rts/shared'
import type { CanonicalReader } from '../canonical/reader.js'
import { CanonicalWriter } from '../canonical/writer.js'
import type { ScheduledCommand } from '../contracts/commands.js'

function writeEntityIds(writer: CanonicalWriter, ids: readonly EntityId[]): void {
  writer.writeLength(ids.length)
  for (const id of ids) {
    writer.writeU32(id)
  }
}

function readEntityIds(reader: CanonicalReader): EntityId[] {
  const count = reader.readLength()
  return Array.from({ length: count }, () => reader.readU32())
}

function writeCoordinates(writer: CanonicalWriter, x: number, y: number): void {
  writer.writeI32(x)
  writer.writeI32(y)
}

function readCoordinates(reader: CanonicalReader): { readonly x: number; readonly y: number } {
  return { x: reader.readI32(), y: reader.readI32() }
}

function writeUnitCoordinates(
  writer: CanonicalWriter,
  payload: { readonly unitIds: readonly EntityId[]; readonly x: number; readonly y: number }
): void {
  writeEntityIds(writer, payload.unitIds)
  writeCoordinates(writer, payload.x, payload.y)
}

function writeUnitTarget(
  writer: CanonicalWriter,
  payload: { readonly unitIds: readonly EntityId[]; readonly targetId: EntityId }
): void {
  writeEntityIds(writer, payload.unitIds)
  writer.writeU32(payload.targetId)
}

type EconomyIntent = Extract<
  CommandIntent,
  {
    readonly type:
      | 'BUILD'
      | 'UPGRADE_CASTLE'
      | 'CANCEL_CONSTRUCTION'
      | 'TRAIN'
      | 'CANCEL_PRODUCTION'
      | 'CANCEL_RESEARCH'
      | 'RESEARCH'
      | 'RALLY'
      | 'SURRENDER'
  }
>

function writeEconomyPayload(writer: CanonicalWriter, intent: EconomyIntent): void {
  switch (intent.type) {
    case 'BUILD':
      writer.writeU32(intent.payload.unitId)
      writer.writeU8(BUILDING_TYPES.indexOf(intent.payload.buildingType))
      writeCoordinates(writer, intent.payload.x, intent.payload.y)
      return
    case 'UPGRADE_CASTLE':
      writer.writeU32(intent.payload.castleId)
      return
    case 'CANCEL_CONSTRUCTION':
      writer.writeU32(intent.payload.buildingId)
      return
    case 'TRAIN':
      writer.writeU32(intent.payload.producerId)
      writer.writeU8(TRAINABLE_UNIT_KINDS.indexOf(intent.payload.unitKind))
      return
    case 'CANCEL_PRODUCTION':
      writer.writeU32(intent.payload.producerId)
      writer.writeU32(intent.payload.queueIndex)
      return
    case 'CANCEL_RESEARCH':
      writer.writeU32(intent.payload.monasteryId)
      writer.writeU32(intent.payload.queueIndex)
      return
    case 'RESEARCH':
      writer.writeU32(intent.payload.monasteryId)
      writer.writeU8(RESEARCH_TYPES.indexOf(intent.payload.researchType))
      return
    case 'RALLY':
      writer.writeU32(intent.payload.producerId)
      writeCoordinates(writer, intent.payload.x, intent.payload.y)
      return
    case 'SURRENDER':
      return
    default:
      assertNever(intent)
  }
}

function writeCommandPayload(writer: CanonicalWriter, intent: CommandIntent): void {
  switch (intent.type) {
    case 'MOVE':
    case 'PATROL':
    case 'ATTACK_MOVE':
      writeUnitCoordinates(writer, intent.payload)
      return
    case 'STOP':
    case 'HOLD':
      writeEntityIds(writer, intent.payload.unitIds)
      return
    case 'ATTACK':
      writeUnitTarget(writer, intent.payload)
      return
    case 'GATHER':
      writeEntityIds(writer, intent.payload.unitIds)
      writer.writeU32(intent.payload.resourceId)
      return
    case 'DEPOSIT':
      writeEntityIds(writer, intent.payload.unitIds)
      writer.writeU32(intent.payload.buildingId)
      return
    case 'REPAIR':
    case 'HEAL':
      writeUnitTarget(writer, intent.payload)
      return
    default:
      writeEconomyPayload(writer, intent)
  }
}

function writeCommandIntent(writer: CanonicalWriter, intent: CommandIntent): void {
  writer.writeU8(COMMAND_TYPES.indexOf(intent.type))
  writeCommandPayload(writer, intent)
}

function readBuildingType(reader: CanonicalReader): (typeof BUILDING_TYPES)[number] {
  const value = BUILDING_TYPES[reader.readU8()]
  if (value === undefined) {
    throw new Error('readCommandIntent: invalid building type')
  }
  return value
}

function readTrainableUnitKind(reader: CanonicalReader): TrainableUnitKind {
  const value = TRAINABLE_UNIT_KINDS[reader.readU8()]
  if (value === undefined) {
    throw new Error('readCommandIntent: invalid trainable unit kind')
  }
  return value
}

function readResearchType(reader: CanonicalReader): ResearchType {
  const value = RESEARCH_TYPES[reader.readU8()]
  if (value === undefined) {
    throw new Error('readCommandIntent: invalid research type')
  }
  return value
}

function readCommandIntent(reader: CanonicalReader): CommandIntent {
  const type = COMMAND_TYPES[reader.readU8()]
  if (type === undefined) {
    throw new Error('readCommandIntent: invalid command type')
  }
  switch (type) {
    case 'MOVE': {
      const ids = readEntityIds(reader)
      const coordinates = readCoordinates(reader)
      return { type, payload: { unitIds: ids, ...coordinates } }
    }
    case 'STOP':
    case 'HOLD':
      return { type, payload: { unitIds: readEntityIds(reader) } }
    case 'PATROL':
    case 'ATTACK_MOVE': {
      const ids = readEntityIds(reader)
      const coordinates = readCoordinates(reader)
      return { type, payload: { unitIds: ids, ...coordinates } }
    }
    case 'ATTACK':
      return { type, payload: { unitIds: readEntityIds(reader), targetId: reader.readU32() } }
    case 'GATHER':
      return { type, payload: { unitIds: readEntityIds(reader), resourceId: reader.readU32() } }
    case 'DEPOSIT':
      return { type, payload: { unitIds: readEntityIds(reader), buildingId: reader.readU32() } }
    case 'REPAIR':
    case 'HEAL':
      return { type, payload: { unitIds: readEntityIds(reader), targetId: reader.readU32() } }
    case 'BUILD': {
      const unitId = reader.readU32()
      const buildingType = readBuildingType(reader)
      const coordinates = readCoordinates(reader)
      return { type, payload: { unitId, buildingType, ...coordinates } }
    }
    case 'UPGRADE_CASTLE':
      return { type, payload: { castleId: reader.readU32() } }
    case 'CANCEL_CONSTRUCTION':
      return { type, payload: { buildingId: reader.readU32() } }
    case 'TRAIN':
      return { type, payload: { producerId: reader.readU32(), unitKind: readTrainableUnitKind(reader) } }
    case 'CANCEL_PRODUCTION':
      return { type, payload: { producerId: reader.readU32(), queueIndex: reader.readU32() } }
    case 'RESEARCH':
      return { type, payload: { monasteryId: reader.readU32(), researchType: readResearchType(reader) } }
    case 'CANCEL_RESEARCH':
      return { type, payload: { monasteryId: reader.readU32(), queueIndex: reader.readU32() } }
    case 'RALLY': {
      const producerId = reader.readU32()
      const coordinates = readCoordinates(reader)
      return { type, payload: { producerId, ...coordinates } }
    }
    case 'SURRENDER':
      return { type, payload: {} }
    default:
      assertNever(type)
  }
}

function readPlayerId(reader: CanonicalReader): PlayerId {
  const playerId = reader.readU8()
  if (playerId > 3) {
    throw new Error('readScheduledCommand: invalid player id')
  }
  return playerId as PlayerId
}

export function encodeScheduledCommand(writer: CanonicalWriter, command: ScheduledCommand): void {
  writer.writeU32(command.tick)
  writer.writeU8(command.playerId)
  writer.writeU32(command.sequence)
  writeCommandIntent(writer, command.intent)
}

export function decodeScheduledCommand(reader: CanonicalReader): ScheduledCommand {
  return {
    tick: reader.readU32(),
    playerId: readPlayerId(reader),
    sequence: reader.readU32(),
    intent: readCommandIntent(reader)
  }
}

function commandBytes(command: ScheduledCommand): Uint8Array {
  const writer = new CanonicalWriter()
  encodeScheduledCommand(writer, command)
  return writer.toBytes()
}

function compareBytes(first: Uint8Array, second: Uint8Array): number {
  const length = Math.min(first.length, second.length)
  for (let index = 0; index < length; index += 1) {
    const difference = (first[index] ?? 0) - (second[index] ?? 0)
    if (difference !== 0) {
      return difference
    }
  }
  return first.length - second.length
}

/** Orders queued commands independently of insertion order. */
export function compareScheduledCommands(first: ScheduledCommand, second: ScheduledCommand): number {
  if (first.tick !== second.tick) {
    return first.tick - second.tick
  }
  if (first.sequence !== second.sequence) {
    return first.sequence - second.sequence
  }
  if (first.playerId !== second.playerId) {
    return first.playerId - second.playerId
  }
  return compareBytes(commandBytes(first), commandBytes(second))
}
