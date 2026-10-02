export const FIXED_SCALE = 256

// One tile is FIXED_SCALE position units (ADR-002): 1 tile = 256 fixed units.
export const ONE_TILE = FIXED_SCALE

export type Fixed = number

export function tilesToFixed(tiles: number): Fixed {
  if (!Number.isFinite(tiles)) {
    throw new Error(`tilesToFixed: non-finite value ${tiles}`)
  }
  const exact = tiles * FIXED_SCALE
  if (!Number.isInteger(exact)) {
    throw new Error(
      `tilesToFixed: ${tiles} is not representable as an integer number of fixed units (scale ${FIXED_SCALE})`
    )
  }
  return exact
}

export function fixedToTiles(fixed: Fixed): number {
  return fixed / FIXED_SCALE
}

// Presentation scale (master plan §23.2 / ADR-015): one tile renders as
// TILE_PIXELS px. These helpers convert between the deterministic fixed
// coordinate space and render pixels. They are presentation-only conversions;
// no gameplay decision may depend on them.
export const TILE_PIXELS = 64

export function fixedToRenderPixels(fixed: Fixed): number {
  return fixed / (FIXED_SCALE / TILE_PIXELS)
}

export function renderPixelsToFixed(pixels: number): Fixed {
  return pixels * (FIXED_SCALE / TILE_PIXELS)
}

export interface GridPosition {
  readonly x: Fixed
  readonly y: Fixed
}

/**
 * Grid layout position for spawn/fixture indexing: index `i` maps to
 * `column = i % columns`, `row = floor(i / columns)`, each cell scaled by
 * `spacing`. Used by fixtures and benchmarks to lay units out without magic
 * column/row arithmetic at call sites.
 */
export function gridPosition(index: number, columns: number, spacing: number): GridPosition {
  return {
    x: (index % columns) * spacing,
    y: Math.floor(index / columns) * spacing
  }
}

export function distSquaredFixed(ax: Fixed, ay: Fixed, bx: Fixed, by: Fixed): number {
  const dx = bx - ax
  const dy = by - ay
  return dx * dx + dy * dy
}

export function intSqrt(n: number): number {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`intSqrt: expected a non-negative integer, got ${n}`)
  }
  if (n === 0) {
    return 0
  }
  let high = 1
  while (high * high < n) {
    high *= 2
  }
  let low = Math.floor(high / 2)
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2)
    if (middle * middle <= n) {
      low = middle
    } else {
      high = middle
    }
  }
  return high * high <= n ? high : low
}
