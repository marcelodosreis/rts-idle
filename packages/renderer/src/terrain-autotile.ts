/**
 * Tiny Swords terrain autotiling — pure, presentation-only.
 *
 * The tileset (`Tilemap_color1.png`, 9x6 grid of 64px tiles) is split into a
 * Flat Ground region (columns 0-3, the low shoreline terrain) and an Elevated
 * Ground region (columns 5-8); column 4 is an empty divider. A cell's piece is
 * chosen from its 4 orthogonal neighbors (N/E/S/W) via a canonical mask
 * lookup: bit = 1 when the neighbor is same-or-higher land, 0 otherwise
 * (water, lower land, or off-map).
 *
 * Tables come from the community guide for the pack
 * (slacker3007/tinyswords-tileset-guide), cross-checked against the official
 * Pixel Frog Tilemap Guide. They are hard-coded here so the game never needs
 * the third-party JSON at runtime. The renderer draws `null` results with the
 * water fill tile; grass and elevated results index the shared tileset.
 *
 * This module has no Pixi/DOM dependency so it is unit-testable and portable —
 * the sprite lab uses it for the autotile playground and the game's
 * `terrain-layer.ts` can adopt it later.
 */

import type { MapTileKind } from '@rts/game-data'

/** Canonical terrain states, shared with the game (`MapTileKind`). */
export type AutoTileTerrain = MapTileKind

export interface AutoTileResult {
  /** 0-based index into the 9x6 tileset, or `null` for water (separate fill). */
  readonly atlasIndex: number | null
  /** NESW mask string, e.g. `'1111'` (bit 1 = neighbor is same-or-higher land). */
  readonly mask: string
  /** Semantic piece id (1-16 flat/elevated), or `null` for water. */
  readonly semanticId: number | null
}

/** Canonical mask → semantic piece id (NESW). Shared by flat and elevated ground. */
const FLAT_GROUND_LOOKUP: Readonly<Record<string, number>> = {
  '0000': 16,
  '0001': 12,
  '0010': 13,
  '0011': 3,
  '0100': 10,
  '0101': 11,
  '0110': 1,
  '0111': 2,
  '1000': 15,
  '1001': 9,
  '1010': 14,
  '1011': 6,
  '1100': 7,
  '1101': 8,
  '1110': 4,
  '1111': 5
}

/** Semantic piece id → 0-based atlas index for the Flat Ground region. */
const FLAT_RAW: Readonly<Record<number, number>> = {
  1: 0,
  2: 1,
  3: 2,
  4: 9,
  5: 10,
  6: 11,
  7: 18,
  8: 19,
  9: 20,
  10: 27,
  11: 28,
  12: 29,
  13: 3,
  14: 12,
  15: 21,
  16: 30
}

/** Semantic piece id → 0-based atlas index for the Elevated Ground region. */
const ELEVATED_RAW: Readonly<Record<number, number>> = {
  1: 5,
  2: 6,
  3: 7,
  4: 14,
  5: 15,
  6: 16,
  7: 23,
  8: 24,
  9: 25,
  10: 32,
  11: 33,
  12: 34,
  13: 8,
  14: 17,
  15: 26,
  16: 35,
  17: 41,
  18: 42,
  19: 43,
  20: 44,
  21: 50,
  22: 51,
  23: 52,
  24: 53
}

function elevationOf(terrain: AutoTileTerrain): number {
  if (terrain === 'water') {
    return -1
  }
  if (terrain === 'elevated') {
    return 1
  }
  return 0
}

/**
 * A neighbor is "same" when it is land at equal-or-higher elevation than the
 * cell. Equal-or-higher counts as same so a lower tier renders center grass
 * under a plateau rim instead of a grass-to-water shoreline edge; water,
 * lower land, and off-map are OTHER (bit 0).
 */
function isSameNeighbor(
  grid: readonly (readonly AutoTileTerrain[])[],
  x: number,
  y: number,
  elevation: number
): boolean {
  const neighbor = grid[y]?.[x]
  if (neighbor === undefined) {
    return false
  }
  return elevationOf(neighbor) >= elevation
}

function neighborMask(
  grid: readonly (readonly AutoTileTerrain[])[],
  x: number,
  y: number,
  cell: AutoTileTerrain
): string {
  const elevation = elevationOf(cell)
  const n = isSameNeighbor(grid, x, y - 1, elevation) ? 1 : 0
  const e = isSameNeighbor(grid, x + 1, y, elevation) ? 1 : 0
  const s = isSameNeighbor(grid, x, y + 1, elevation) ? 1 : 0
  const w = isSameNeighbor(grid, x - 1, y, elevation) ? 1 : 0
  return `${n}${e}${s}${w}`
}

/**
 * Selects the tileset piece for a map cell. Water is not drawn from the atlas
 * (returns `null`); land and elevated cells resolve their 4-neighbor mask.
 * An elevated cell whose south neighbor is lower already resolves to a
 * cliff-lip piece purely through the mask: a water cell to the north clears
 * the N bit and yields the grass-meets-rock lip, while same-elevation land to
 * the north keeps the all-grass lip (per the guide's waterCliffTopRule — the
 * lookup encodes the substitution, so no extra mapping is needed).
 */
export function autotileTile(grid: readonly (readonly AutoTileTerrain[])[], x: number, y: number): AutoTileResult {
  const cell = grid[y]?.[x]
  if (cell === undefined || cell === 'water') {
    return { atlasIndex: null, mask: '', semanticId: null }
  }
  const mask = neighborMask(grid, x, y, cell)
  const semantic = FLAT_GROUND_LOOKUP[mask]
  if (semantic === undefined) {
    throw new Error(`no piece for neighbor mask ${mask}`)
  }
  const raw = cell === 'elevated' ? ELEVATED_RAW[semantic] : FLAT_RAW[semantic]
  if (raw === undefined) {
    throw new Error(`no atlas tile for semantic piece ${semantic}`)
  }
  return { atlasIndex: raw, mask, semanticId: semantic }
}

/**
 * Cliff base piece overlaid one tile below an elevated cell whose south
 * neighbor is lower. The art has only south-facing cliffs: a single base row
 * terminates on walkable land (sheet 42-45) or in water (sheet 51-54), and the
 * horizontal variant (left/mid/right/narrow) matches the lip continuity — a
 * side is an open rounded END only when that neighbor is strictly lower.
 * Returns `null` when no base is drawn.
 */
export function cliffBase(grid: readonly (readonly AutoTileTerrain[])[], x: number, y: number): number | null {
  const cell = grid[y]?.[x]
  if (cell !== 'elevated') {
    return null
  }
  const south = grid[y + 1]?.[x]
  if (south === undefined || elevationOf(south) >= 1) {
    return null
  }
  const west = grid[y]?.[x - 1]
  const east = grid[y]?.[x + 1]
  const westOpen = west === undefined || elevationOf(west) < 1
  const eastOpen = east === undefined || elevationOf(east) < 1
  const onWater = elevationOf(south) === -1
  // 0-based raw indices: land 42-45 / water 51-54 (left, mid, right, narrow).
  const base = onWater ? { left: 50, mid: 51, right: 52, narrow: 53 } : { left: 41, mid: 42, right: 43, narrow: 44 }
  if (westOpen && eastOpen) {
    return base.narrow
  }
  if (westOpen) {
    return base.left
  }
  if (eastOpen) {
    return base.right
  }
  return base.mid
}

export interface StairTileResult {
  /** Bottom ramp half, anchored at the stair cell `(x, y)`. */
  readonly bottom: number
  /** Top ramp half, drawn one tile up at `(x, y - 1)`. */
  readonly top: number
}

/**
 * Atlas pieces for a stair ramp. A stair occupies two tiles: a bottom half at
 * the anchor cell and a top half one tile above, both from the elevated
 * region of the tileset. Shared by the sprite lab and the game terrain layer
 * so ramps render identically everywhere.
 */
export function stairTile(direction: 'left' | 'right'): StairTileResult {
  if (direction === 'left') {
    return { bottom: 45, top: 36 }
  }
  return { bottom: 48, top: 39 }
}
