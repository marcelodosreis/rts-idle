import { describe, expect, it } from 'vitest'
import { CanonicalReader } from '../../../packages/simulation/src/canonical/reader.js'
import { utf8Decode, utf8Encode } from '../../../packages/simulation/src/canonical/utf8.js'
import { CanonicalWriter } from '../../../packages/simulation/src/canonical/writer.js'

describe('canonical writer/reader', () => {
  it('round-trips u8 values', () => {
    const writer = new CanonicalWriter()
    writer.writeU8(0)
    writer.writeU8(255)
    const reader = new CanonicalReader(writer.toBytes())
    expect(reader.readU8()).toBe(0)
    expect(reader.readU8()).toBe(255)
  })

  it('round-trips u32 values including the maximum', () => {
    const writer = new CanonicalWriter()
    writer.writeU32(0)
    writer.writeU32(0xffffffff)
    writer.writeU32(0x80000000)
    const reader = new CanonicalReader(writer.toBytes())
    expect(reader.readU32()).toBe(0)
    expect(reader.readU32()).toBe(0xffffffff)
    expect(reader.readU32()).toBe(0x80000000)
  })

  it('round-trips i32 values including negatives', () => {
    const writer = new CanonicalWriter()
    writer.writeI32(0)
    writer.writeI32(-1)
    writer.writeI32(2147483647)
    writer.writeI32(-2147483648)
    const reader = new CanonicalReader(writer.toBytes())
    expect(reader.readI32()).toBe(0)
    expect(reader.readI32()).toBe(-1)
    expect(reader.readI32()).toBe(2147483647)
    expect(reader.readI32()).toBe(-2147483648)
  })

  it('round-trips a 64-bit value as lo/hi words (lo word serialized first)', () => {
    const writer = new CanonicalWriter()
    writer.writeU64(0xdeadbeef, 0x01234567)
    const reader = new CanonicalReader(writer.toBytes())
    const bytes = reader.readBytes(8)
    expect(bytes).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x01, 0x23, 0x45, 0x67]))
  })

  it('round-trips arbitrary byte arrays', () => {
    const writer = new CanonicalWriter()
    writer.writeBytes(new Uint8Array([1, 2, 3, 255, 0]))
    const reader = new CanonicalReader(writer.toBytes())
    expect(reader.readBytes(5)).toEqual(new Uint8Array([1, 2, 3, 255, 0]))
  })

  it('round-trips strings with explicit length', () => {
    const writer = new CanonicalWriter()
    writer.writeString('hello')
    const reader = new CanonicalReader(writer.toBytes())
    expect(reader.readString()).toBe('hello')
  })

  it('round-trips length values', () => {
    const writer = new CanonicalWriter()
    writer.writeLength(42)
    const reader = new CanonicalReader(writer.toBytes())
    expect(reader.readLength()).toBe(42)
  })

  it('rejects reads beyond the buffer', () => {
    const writer = new CanonicalWriter()
    writer.writeU8(1)
    const reader = new CanonicalReader(writer.toBytes())
    reader.readU8()
    expect(() => reader.readU8()).toThrow()
    expect(() => reader.readU32()).toThrow()
    expect(() => reader.readBytes(2)).toThrow()
  })

  it('rejects reads from an empty buffer', () => {
    const reader = new CanonicalReader(new Uint8Array())
    expect(() => reader.readU8()).toThrow()
  })
})

describe('canonical utf8 codec', () => {
  const CASES = [
    '',
    'a',
    'hello world',
    'olá mundo', // 2-byte sequences (U+00E1, U+00E3)
    '中文', // 3-byte sequences
    '🌍', // 4-byte sequence + surrogate pair
    'a\u0000b', // embedded NUL
    '\u007f\u0080\u07ff\u0800\uffff', // boundary code points
    '\u{10000}\u{10ffff}' // surrogate-pair range boundaries
  ]

  for (const value of CASES) {
    it(`round-trips ${JSON.stringify(value)}`, () => {
      const encoded = utf8Encode(value)
      expect(utf8Decode(new Uint8Array(encoded))).toBe(value)
    })
  }

  it('encodes to the standard UTF-8 byte sequences', () => {
    expect(utf8Encode('A')).toEqual([0x41])
    expect(utf8Encode('é')).toEqual([0xc3, 0xa9])
    expect(utf8Encode('中')).toEqual([0xe4, 0xb8, 0xad])
    expect(utf8Encode('🌍')).toEqual([0xf0, 0x9f, 0x8c, 0x8d])
  })

  it('rejects invalid leading bytes', () => {
    expect(() => utf8Decode(new Uint8Array([0x80]))).toThrow()
    expect(() => utf8Decode(new Uint8Array([0xc1, 0x80]))).toThrow()
    expect(() => utf8Decode(new Uint8Array([0xff]))).toThrow()
  })
})
