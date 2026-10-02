import { type Fixed, type PlayerId, RESOURCE_TYPES, type ResourceType, type UnitKind } from '@rts/shared'
import type { CanonicalReader } from '../canonical/reader.js'
import type { CanonicalWriter } from '../canonical/writer.js'
import type { Order } from '../contracts/orders.js'
import { buildingTypeFromTag, buildingTypeTag, kindFromTag, kindTag } from './codecs.js'

export interface ComponentKey {
  readonly name: string
}

export interface ComponentType<T> extends ComponentKey {
  readonly name: string
  readonly encode: (writer: CanonicalWriter, value: T) => void
  readonly decode: (reader: CanonicalReader) => T
}

export interface PositionData {
  readonly x: Fixed
  readonly y: Fixed
}

export interface OwnerData {
  readonly owner: PlayerId
}

export interface MovementData {
  /** Movement speed in tiles per second multiplied by MOVEMENT_SPEED_SCALE. */
  readonly speedTilesPerSecondFixed: number
  readonly destX: Fixed
  readonly destY: Fixed
  /** Fractional x remainder in sub-units (0..MOVEMENT_SUB-1). */
  readonly remainderX: number
  /** Fractional y remainder in sub-units (0..MOVEMENT_SUB-1). */
  readonly remainderY: number
}

export const Position: ComponentType<PositionData> = {
  name: 'position',
  encode(writer, value) {
    writer.writeI32(value.x)
    writer.writeI32(value.y)
  },
  decode(reader) {
    return { x: reader.readI32(), y: reader.readI32() }
  }
}

export const Owner: ComponentType<OwnerData> = {
  name: 'owner',
  encode(writer, value) {
    writer.writeU8(value.owner)
  },
  decode(reader) {
    const owner = reader.readU8()
    // The canonical format only ever stores a valid slot (0-3); anything else
    // is corruption, not a valid player.
    if (owner === 0 || owner === 1 || owner === 2 || owner === 3) {
      return { owner }
    }
    throw new Error(`Owner: invalid owner slot ${owner}`)
  }
}

export const Movement: ComponentType<MovementData> = {
  name: 'movement',
  encode(writer, value) {
    writer.writeI32(value.speedTilesPerSecondFixed)
    writer.writeI32(value.destX)
    writer.writeI32(value.destY)
    writer.writeI32(value.remainderX)
    writer.writeI32(value.remainderY)
  },
  decode(reader) {
    return {
      speedTilesPerSecondFixed: reader.readI32(),
      destX: reader.readI32(),
      destY: reader.readI32(),
      remainderX: reader.readI32(),
      remainderY: reader.readI32()
    }
  }
}

export interface OrdersData {
  readonly queue: readonly Order[]
}

// Order type tags in the canonical stream. The numeric values are part of the
// schema; reordering them changes serialized bytes and the golden hash.
const ORDER_TAG_STOP = 0
const ORDER_TAG_HOLD = 1
const ORDER_TAG_PATROL = 2
const ORDER_TAG_ATTACK = 3
const ORDER_TAG_ATTACK_MOVE = 4
const ORDER_TAG_GATHER = 5
const ORDER_TAG_BUILD = 6
const ORDER_TAG_DEPOSIT = 7
const ORDER_TAG_REPAIR = 8
const ORDER_TAG_HEAL = 9

const GATHER_PHASE_TAGS = {
  TO_RESOURCE: 0,
  HARVESTING: 1,
  TO_BASE: 2,
  WAITING_FOR_BASE: 3
} as const
function writeGatherPhase(writer: CanonicalWriter, phase: Extract<Order, { type: 'GATHER' }>['phase']): void {
  writer.writeU8(GATHER_PHASE_TAGS[phase])
}

function readGatherPhase(reader: CanonicalReader): Extract<Order, { type: 'GATHER' }>['phase'] {
  const tag = reader.readU8()
  switch (tag) {
    case GATHER_PHASE_TAGS.TO_RESOURCE:
      return 'TO_RESOURCE'
    case GATHER_PHASE_TAGS.HARVESTING:
      return 'HARVESTING'
    case GATHER_PHASE_TAGS.TO_BASE:
      return 'TO_BASE'
    case GATHER_PHASE_TAGS.WAITING_FOR_BASE:
      return 'WAITING_FOR_BASE'
    default:
      throw new Error(`Orders: invalid gather phase tag ${tag}`)
  }
}

function writeOrder(writer: CanonicalWriter, order: Order): void {
  switch (order.type) {
    case 'STOP':
      writer.writeU8(ORDER_TAG_STOP)
      return
    case 'HOLD':
      writer.writeU8(ORDER_TAG_HOLD)
      return
    case 'PATROL':
      writer.writeU8(ORDER_TAG_PATROL)
      writer.writeI32(order.x)
      writer.writeI32(order.y)
      return
    case 'ATTACK':
      writer.writeU8(ORDER_TAG_ATTACK)
      writer.writeU32(order.targetId)
      return
    case 'ATTACK_MOVE':
      writer.writeU8(ORDER_TAG_ATTACK_MOVE)
      writer.writeI32(order.x)
      writer.writeI32(order.y)
      return
    case 'GATHER':
      writeGatherOrder(writer, order)
      return
    case 'BUILD':
      writer.writeU8(ORDER_TAG_BUILD)
      writer.writeU32(order.buildingId)
      writer.writeU8(buildingTypeTag(order.buildingType))
      writer.writeI32(order.workPoint.x)
      writer.writeI32(order.workPoint.y)
      return
    case 'DEPOSIT':
      writer.writeU8(ORDER_TAG_DEPOSIT)
      writer.writeU32(order.buildingId)
      return
    case 'REPAIR':
      writer.writeU8(ORDER_TAG_REPAIR)
      writer.writeU32(order.targetId)
      writer.writeI32(order.progressTicks)
      return
    case 'HEAL':
      writer.writeU8(ORDER_TAG_HEAL)
      writer.writeU32(order.targetId)
      return
  }
}

function writeGatherOrder(writer: CanonicalWriter, order: Extract<Order, { type: 'GATHER' }>): void {
  writer.writeU8(ORDER_TAG_GATHER)
  writer.writeU32(order.resourceId)
  writer.writeU8(order.baseId === null ? 0 : 1)
  if (order.baseId !== null) {
    writer.writeU32(order.baseId)
  }
  writeGatherPhase(writer, order.phase)
  writer.writeI32(order.progressTicks)
}

function readOrder(reader: CanonicalReader): Order {
  const tag = reader.readU8()
  switch (tag) {
    case ORDER_TAG_STOP:
      return { type: 'STOP' }
    case ORDER_TAG_HOLD:
      return { type: 'HOLD' }
    case ORDER_TAG_PATROL:
      return { type: 'PATROL', x: reader.readI32(), y: reader.readI32() }
    case ORDER_TAG_ATTACK:
      return { type: 'ATTACK', targetId: reader.readU32() }
    case ORDER_TAG_ATTACK_MOVE:
      return { type: 'ATTACK_MOVE', x: reader.readI32(), y: reader.readI32() }
    case ORDER_TAG_GATHER: {
      const resourceId = reader.readU32()
      const basePresent = reader.readU8()
      if (basePresent !== 0 && basePresent !== 1) {
        throw new Error(`Orders: invalid gather base presence ${basePresent}`)
      }
      const baseId = basePresent === 1 ? reader.readU32() : null
      const phase = readGatherPhase(reader)
      const progressTicks = reader.readI32()
      return { type: 'GATHER', resourceId, baseId, phase, progressTicks }
    }
    case ORDER_TAG_BUILD: {
      const buildingId = reader.readU32()
      const buildingType = buildingTypeFromTag(reader.readU8())
      return {
        type: 'BUILD',
        buildingId,
        buildingType,
        workPoint: { x: reader.readI32(), y: reader.readI32() }
      }
    }
    case ORDER_TAG_DEPOSIT:
      return { type: 'DEPOSIT', buildingId: reader.readU32() }
    case ORDER_TAG_REPAIR:
      return { type: 'REPAIR', targetId: reader.readU32(), progressTicks: reader.readI32() }
    case ORDER_TAG_HEAL:
      return { type: 'HEAL', targetId: reader.readU32() }
    default:
      // A bad tag is corruption, not a valid order.
      throw new Error(`Orders: invalid order tag ${tag}`)
  }
}

export const Orders: ComponentType<OrdersData> = {
  name: 'orders',
  encode(writer, value) {
    writer.writeLength(value.queue.length)
    for (const order of value.queue) {
      writeOrder(writer, order)
    }
  },
  decode(reader) {
    const count = reader.readLength()
    const queue: Order[] = []
    for (let i = 0; i < count; i += 1) {
      queue.push(readOrder(reader))
    }
    return { queue }
  }
}

export interface HealthData {
  readonly current: number
  readonly max: number
}

export const Health: ComponentType<HealthData> = {
  name: 'health',
  encode(writer, value) {
    writer.writeI32(value.current)
    writer.writeI32(value.max)
  },
  decode(reader) {
    return { current: reader.readI32(), max: reader.readI32() }
  }
}

export interface CombatData {
  /** Base armor before research modifiers. */
  readonly armor: number
  /** Damage dealt per attack. */
  readonly damage: number
  /** Attack range in tiles. */
  readonly rangeTiles: number
  /** Full cooldown in ticks between attacks. */
  readonly cooldownTicks: number
  /** Ticks remaining before the next attack is allowed. */
  readonly cooldownRemaining: number
}

export const Combat: ComponentType<CombatData> = {
  name: 'combat',
  encode(writer, value) {
    writer.writeI32(value.armor)
    writer.writeI32(value.damage)
    writer.writeI32(value.rangeTiles)
    writer.writeI32(value.cooldownTicks)
    writer.writeI32(value.cooldownRemaining)
  },
  decode(reader) {
    return {
      armor: reader.readI32(),
      damage: reader.readI32(),
      rangeTiles: reader.readI32(),
      cooldownTicks: reader.readI32(),
      cooldownRemaining: reader.readI32()
    }
  }
}

export interface AbilityCooldownData {
  readonly healCooldownRemaining: number
}

export const AbilityCooldown: ComponentType<AbilityCooldownData> = {
  name: 'abilityCooldown',
  encode(writer, value) {
    writer.writeI32(value.healCooldownRemaining)
  },
  decode(reader) {
    return { healCooldownRemaining: reader.readI32() }
  }
}

export type KindData = UnitKind

export const Kind: ComponentType<KindData> = {
  name: 'kind',
  encode(writer, value) {
    writer.writeU8(kindTag(value))
  },
  decode(reader) {
    return kindFromTag(reader.readU8())
  }
}

export interface CargoData {
  readonly amount: number
  readonly capacity: number
  readonly resourceType: ResourceType | null
}

export const Cargo: ComponentType<CargoData> = {
  name: 'cargo',
  encode(writer, value) {
    writer.writeI32(value.amount)
    writer.writeI32(value.capacity)
    writer.writeU8(value.resourceType === null ? 0 : RESOURCE_TYPES.indexOf(value.resourceType) + 1)
  },
  decode(reader) {
    const amount = reader.readI32()
    const capacity = reader.readI32()
    const tag = reader.readU8()
    if (tag === 0) {
      return { amount, capacity, resourceType: null }
    }
    const resourceType = RESOURCE_TYPES[tag - 1]
    if (resourceType === undefined) {
      throw new Error(`Cargo: invalid resource type tag ${tag}`)
    }
    return { amount, capacity, resourceType }
  }
}

export {
  isResearchProductionItem,
  Production,
  type ProductionData,
  type ProductionItem,
  type ResearchProductionItem,
  type UnitProductionItem
} from './production-component.js'
