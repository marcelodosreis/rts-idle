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

export interface OrderQueueData {
  readonly orders: readonly Order[]
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

function writeOrder(writer: CanonicalWriter, order: Order): void {
  switch (order.type) {
    case 'MOVE':
      writer.writeU8(0)
      writer.writeI32(order.x)
      writer.writeI32(order.y)
      return
    case 'ATTACK':
      writer.writeU8(1)
      writer.writeU32(order.targetId)
      return
    case 'ATTACK_MOVE':
      writer.writeU8(2)
      writer.writeI32(order.x)
      writer.writeI32(order.y)
      return
    case 'HOLD':
      writer.writeU8(3)
      return
    case 'PATROL':
      writer.writeU8(4)
      writer.writeI32(order.x1)
      writer.writeI32(order.y1)
      writer.writeI32(order.x2)
      writer.writeI32(order.y2)
      return
  }
}

function readOrder(reader: CanonicalReader): Order {
  const tag = reader.readU8()
  switch (tag) {
    case 0:
      return { type: 'MOVE', x: reader.readI32(), y: reader.readI32() }
    case 1:
      return { type: 'ATTACK', targetId: reader.readU32() }
    case 2:
      return { type: 'ATTACK_MOVE', x: reader.readI32(), y: reader.readI32() }
    case 3:
      return { type: 'HOLD' }
    case 4:
      return {
        type: 'PATROL',
        x1: reader.readI32(),
        y1: reader.readI32(),
        x2: reader.readI32(),
        y2: reader.readI32()
      }
    default:
      throw new Error(`OrderQueue: unknown order tag ${tag}`)
  }
}

export const OrderQueue: ComponentType<OrderQueueData> = {
  name: 'order-queue',
  encode(writer, value) {
    writer.writeLength(value.orders.length)
    for (const order of value.orders) {
      writeOrder(writer, order)
    }
  },
  decode(reader) {
    const count = reader.readLength()
    const orders: Order[] = []
    for (let i = 0; i < count; i += 1) {
      orders.push(readOrder(reader))
    }
    return { orders }
  }
}
