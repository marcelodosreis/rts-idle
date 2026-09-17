const U8 = 1
const U32 = 4

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

export class CanonicalReader {
  private readonly bytes: Uint8Array
  private offset = 0

  constructor(bytes: Uint8Array) {
    this.bytes = bytes
  }

  private ensureAvailable(count: number): void {
    if (this.offset + count > this.bytes.length) {
      throw new Error(`CanonicalReader: out of bounds (need ${count} bytes at offset ${this.offset})`)
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

export function utf8Encode(value: string): number[] {
  const bytes: number[] = []
  for (let i = 0; i < value.length; i += 1) {
    let code = value.charCodeAt(i)
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length) {
      const low = value.charCodeAt(i + 1)
      if (low >= 0xdc00 && low <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00)
        i += 1
      }
    }
    if (code < 0x80) {
      bytes.push(code)
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    } else {
      bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    }
  }
  return bytes
}

export function utf8Decode(bytes: Uint8Array): string {
  let out = ''
  let i = 0
  while (i < bytes.length) {
    const b0 = bytes[i] ?? 0
    if (b0 < 0x80) {
      out += String.fromCharCode(b0)
      i += 1
    } else if (b0 >= 0xc2 && b0 <= 0xdf) {
      const b1 = bytes[i + 1] ?? 0
      out += String.fromCharCode(((b0 & 0x1f) << 6) | (b1 & 0x3f))
      i += 2
    } else if (b0 >= 0xe0 && b0 <= 0xef) {
      const b1 = bytes[i + 1] ?? 0
      const b2 = bytes[i + 2] ?? 0
      out += String.fromCharCode(((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f))
      i += 3
    } else if (b0 >= 0xf0 && b0 <= 0xf4) {
      const b1 = bytes[i + 1] ?? 0
      const b2 = bytes[i + 2] ?? 0
      const b3 = bytes[i + 3] ?? 0
      const code = ((b0 & 0x07) << 18) | ((b1 & 0x3f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f)
      const cp = code - 0x10000
      out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff))
      i += 4
    } else {
      throw new Error(`utf8Decode: invalid leading byte 0x${b0.toString(16)} at ${i}`)
    }
  }
  return out
}
