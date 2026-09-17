import { utf8Encode } from './utf8.js'

/**
 * Appends primitive values to a canonical byte stream (ADR-002/011).
 * Integers are big-endian with a fixed width; strings carry a uint32 length.
 */
export class CanonicalWriter {
  private readonly bytes: number[] = []

  writeU8(value: number): void {
    this.bytes.push(value & 0xff)
  }

  writeU32(value: number): void {
    this.writeU8(value >>> 24)
    this.writeU8(value >>> 16)
    this.writeU8(value >>> 8)
    this.writeU8(value)
  }

  writeI32(value: number): void {
    this.writeU32(value >>> 0)
  }

  writeU64(lo: number, hi: number): void {
    this.writeU32(lo >>> 0)
    this.writeU32(hi >>> 0)
  }

  writeBytes(value: Uint8Array): void {
    for (let i = 0; i < value.length; i += 1) {
      this.writeU8(value[i] ?? 0)
    }
  }

  writeString(value: string): void {
    const encoded = utf8Encode(value)
    this.writeU32(encoded.length)
    for (const byte of encoded) {
      this.writeU8(byte)
    }
  }

  writeLength(value: number): void {
    this.writeU32(value)
  }

  toBytes(): Uint8Array {
    return Uint8Array.from(this.bytes)
  }
}
