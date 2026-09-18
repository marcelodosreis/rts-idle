import type { Fixed, PlayerId } from '@rts/shared'
import type { CanonicalReader } from '../canonical/reader.js'
import type { CanonicalWriter } from '../canonical/writer.js'
import type { Order } from '../contracts/orders.js'

export interface ComponentType<T> {
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
  /** Movement speed in tiles per second (integer). */
  readonly speedTilesPerSecond: number
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
    writer.writeI32(value.speedTilesPerSecond)
    writer.writeI32(value.destX)
    writer.writeI32(value.destY)
    writer.writeI32(value.remainderX)
    writer.writeI32(value.remainderY)
  },
  decode(reader) {
    return {
      speedTilesPerSecond: reader.readI32(),
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
  }
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
    writer.writeI32(value.damage)
    writer.writeI32(value.rangeTiles)
    writer.writeI32(value.cooldownTicks)
    writer.writeI32(value.cooldownRemaining)
  },
  decode(reader) {
    return {
      damage: reader.readI32(),
      rangeTiles: reader.readI32(),
      cooldownTicks: reader.readI32(),
      cooldownRemaining: reader.readI32()
    }
  }
}
