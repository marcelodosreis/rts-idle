import type { Fixed, PlayerId } from '@rts/shared'
import type { CanonicalReader } from '../canonical/reader.js'
import type { CanonicalWriter } from '../canonical/writer.js'

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
