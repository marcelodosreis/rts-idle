import type { AssetEntry, AssetKind } from '@rts/shared'
import { pngDimensions } from './png-dimensions.js'

export interface GeometryInput {
  readonly file: string
  readonly kind: AssetKind
  /** Explicit frame cell width for `tileset`/`static` (defaults to the strip rule). */
  readonly cell?: number
}

/**
 * Derives frame geometry from a PNG strip: the frame cell is the square of the
 * strip height and the frame count is `width / height` (master plan §23.2).
 * `tileset` uses an explicit cell size and reports the grid. `static` is a
 * single frame. Throws when the strip width is not divisible by the cell width.
 */
export function deriveFrameGeometry(
  input: GeometryInput
): Pick<AssetEntry, 'cellW' | 'cellH' | 'frames' | 'columns' | 'rows'> {
  const { width, height } = pngDimensions(input.file)

  if (input.kind === 'tileset') {
    const cell = input.cell ?? 64
    if (width % cell !== 0 || height % cell !== 0) {
      throw new Error(`${input.file}: ${width}x${height} not divisible by tile ${cell}`)
    }
    return { cellW: cell, cellH: cell, frames: 1, columns: width / cell, rows: height / cell }
  }

  if (input.kind === 'static') {
    return { cellW: width, cellH: height, frames: 1 }
  }

  const cellW = height
  if (width % cellW !== 0) {
    throw new Error(`${input.file}: width ${width} not divisible by cell ${cellW}`)
  }
  return { cellW, cellH: height, frames: width / cellW }
}
