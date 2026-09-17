/**
 * Terrain kinds drawn by the presentation layer (ADR-004 content-as-data).
 * These are the canonical terrain states shared by the game and the sprite
 * lab: `water` (impassable fill), `land` (walkable ground), and `elevated`
 * (walkable plateau rendered with autotile cliffs). Decorations such as rocks
 * and bushes are not terrain — they are scattered on top via `dressTerrain`.
 */
export type MapTileKind = 'water' | 'land' | 'elevated'

/** A stair ramp cell: anchors at `(x, y)` and climbs one tile upward. */
export interface StairEntry {
  readonly x: number
  readonly y: number
  readonly direction: 'left' | 'right'
}

export interface MapDefinition {
  /** Width and height in tiles (1 tile = 64 render px, master plan §23.2). */
  readonly width: number
  readonly height: number
  /** Row-major tile kinds, `width * height` entries. */
  readonly tiles: readonly MapTileKind[]
  /** Stair ramps (presentation); empty when omitted. */
  readonly stairs?: readonly StairEntry[]
  /** Terrain tileset palette (color1-5); defaults to `color1`. */
  readonly palette?: string
  /** Deterministic decoration seed; defaults to a fixed value when omitted. */
  readonly decorationSeed?: number
}

export interface MapPosition {
  readonly x: number
  readonly y: number
}

/** Tile kind at a row-major index. */
export function tileAt(map: MapDefinition, index: number): MapTileKind {
  const tile = map.tiles[index]
  if (tile === undefined) {
    throw new Error(`tileAt: index ${index} outside map ${map.width}x${map.height}`)
  }
  return tile
}

/** Tile kind at tile coordinates, or `null` when outside the map. */
export function tileAtPosition(map: MapDefinition, x: number, y: number): MapTileKind | null {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) {
    return null
  }
  return map.tiles[y * map.width + x] ?? null
}
