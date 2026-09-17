import { CanonicalError } from './error.js'

/**
 * Portable UTF-8 encode/decode (ADR-011). Hand-rolled so the deterministic
 * core never depends on platform `TextEncoder`/`TextDecoder`, which are DOM
 * APIs unavailable in every runtime the simulation targets.
 */

/** Encodes a string to its UTF-8 byte sequence (as a plain number list). */
export function utf8Encode(value: string): number[] {
  const bytes: number[] = []
  for (let i = 0; i < value.length; i += 1) {
    let code = value.charCodeAt(i)
    // Combine a surrogate pair (U+10000..U+10FFFF) into a single code point.
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

/** Decodes a UTF-8 byte sequence back into a string; invalid bytes throw. */
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
      throw new CanonicalError(`utf8Decode: invalid leading byte 0x${b0.toString(16)} at ${i}`)
    }
  }
  return out
}
