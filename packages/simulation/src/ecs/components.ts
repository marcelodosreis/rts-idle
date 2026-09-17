import type { CanonicalReader, CanonicalWriter } from '../canonical/encoder.js'

export interface ComponentType<T> {
  readonly name: string
  readonly encode: (writer: CanonicalWriter, value: T) => void
  readonly decode: (reader: CanonicalReader) => T
}

export interface PositionData {
  readonly x: number
  readonly y: number
}

export interface OwnerData {
  readonly owner: number
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
    return { owner: reader.readU8() }
  }
}
