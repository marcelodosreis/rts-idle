import { readFileSync } from 'node:fs'

/**
 * Reads the width and height of a PNG from its IHDR chunk without decoding
 * the image. PNG signature (8 bytes) + IHDR length/type (8 bytes) + width at
 * offset 16 and height at offset 20, both big-endian u32.
 */
export function pngDimensions(filePath: string): { readonly width: number; readonly height: number } {
  const bytes = readFileSync(filePath)
  if (bytes.length < 24) {
    throw new Error(`not a PNG (too short): ${filePath}`)
  }
  if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error(`not a PNG (bad signature): ${filePath}`)
  }
  const width = bytes.readUInt32BE(16)
  const height = bytes.readUInt32BE(20)
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error(`invalid PNG dimensions: ${filePath}`)
  }
  return { width, height }
}
