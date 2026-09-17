/** Rotates a 32-bit value left by `shift` bits, wrapping within uint32. */
export function rotateLeft(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0
}
