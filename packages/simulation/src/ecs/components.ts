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
