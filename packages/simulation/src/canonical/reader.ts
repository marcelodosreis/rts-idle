import { CanonicalError } from './error.js'
import { utf8Decode } from './utf8.js'

const U8 = 1
const U32 = 4

/**
 * Reads primitive values from a canonical byte stream produced by
 * {@link CanonicalWriter}. Reads past the end of the buffer throw.
 */
export class CanonicalReader {
  private readonly bytes: Uint8Array
  private offset = 0

  constructor(bytes: Uint8Array) {
    this.bytes = bytes
  }

  private ensureAvailable(count: number): void {
    if (this.offset + count > this.bytes.length) {
      throw new CanonicalError(
        `CanonicalReader: out of bounds (need ${count} bytes at offset ${this.offset}, buffer has ${this.bytes.length})`
      )
    }
  }

  readU8(): number {
    this.ensureAvailable(U8)
    const value = this.bytes[this.offset] ?? 0
    this.offset += U8
    return value
  }

  readU32(): number {
    this.ensureAvailable(U32)
    const value =
      ((((this.bytes[this.offset] ?? 0) << 24) |
        ((this.bytes[this.offset + 1] ?? 0) << 16) |
        ((this.bytes[this.offset + 2] ?? 0) << 8) |
        (this.bytes[this.offset + 3] ?? 0)) >>>
        0) >>>
      0
    this.offset += U32
    return value
  }

  readI32(): number {
    return this.readU32() | 0
  }

  readBytes(length: number): Uint8Array {
    this.ensureAvailable(length)
    const out = this.bytes.slice(this.offset, this.offset + length)
    this.offset += length
    return out
  }

  readString(): string {
    const length = this.readU32()
    return utf8Decode(this.readBytes(length))
  }

  readLength(): number {
    return this.readU32()
  }
}
