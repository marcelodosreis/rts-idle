/** Terrain kinds drawn by the presentation layer (ADR-004 content-as-data). */
export type MapTileKind = 'grass' | 'water' | 'rock'

export interface MapDefinition {
  /** Width and height in tiles (1 tile = 64 render px, master plan §23.2). */
  readonly width: number
  readonly height: number
  /** Row-major tile kinds, `width * height` entries. */
  readonly tiles: readonly MapTileKind[]
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
