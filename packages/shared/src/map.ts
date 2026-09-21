export const MAP_TILE_KINDS = ['water', 'land', 'elevated'] as const
export type MapTileKind = (typeof MAP_TILE_KINDS)[number]
export const DRESSING_KINDS = [
  'bush',
  'tree',
  'rock',
  'cloud',
  'water_rock',
  'gold',
  'gold_stone',
  'wood',
  'meat',
  'sheep'
] as const
export type DressingKind = (typeof DRESSING_KINDS)[number]
export interface TileCoordinate {
  readonly x: number
  readonly y: number
}
export interface DecorationPlacement extends TileCoordinate {
  readonly kind: DressingKind
  readonly variant?: number
}
export interface StairEntry extends TileCoordinate {
  readonly direction: 'left' | 'right'
}
export interface MapDefinition {
  readonly width: number
  readonly height: number
  readonly tiles: readonly MapTileKind[]
  readonly stairs?: readonly StairEntry[]
  readonly palette?: string
  readonly decorationSeed?: number
  readonly decorations?: readonly DecorationPlacement[]
  readonly decorationCounts?: Readonly<Partial<Record<DressingKind, number>>>
}

export function tileIndex(width: number, x: number, y: number): number {
  return y * width + x
}

export function tileKey(x: number, y: number): string {
  return `${x},${y}`
}

/** Bounded structural limits for untrusted editor and match-map input. */
export const MAX_MAP_DIMENSION = 256
export const MAX_MAP_TILES = 65_536

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}

function isCoordinateInMap(value: Record<string, unknown>, width: number, height: number): boolean {
  return isInteger(value.x) && isInteger(value.y) && value.x >= 0 && value.y >= 0 && value.x < width && value.y < height
}

/**
 * Validates external map data and returns an independent, normalized map.
 * Semantic content policy remains owned by game-data; this guard protects all
 * structural consumers (editor, protocol, renderer) from malformed input.
 */
export function normalizeMapDefinition(
  value: unknown
): { readonly ok: true; readonly map: MapDefinition } | { readonly ok: false; readonly errors: readonly string[] } {
  if (!isRecord(value)) {
    return { ok: false, errors: ['expected a JSON object'] }
  }
  const { width, height } = value
  if (
    !isInteger(width) ||
    !isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > MAX_MAP_DIMENSION ||
    height > MAX_MAP_DIMENSION ||
    width * height > MAX_MAP_TILES
  ) {
    return { ok: false, errors: ['map dimensions are outside supported bounds'] }
  }
  if (
    !Array.isArray(value.tiles) ||
    value.tiles.length !== width * height ||
    value.tiles.some((tile) => !MAP_TILE_KINDS.includes(tile as MapTileKind))
  ) {
    return { ok: false, errors: ['tiles must contain one known terrain value per map cell'] }
  }
  const stairs = value.stairs
  if (
    stairs !== undefined &&
    (!Array.isArray(stairs) ||
      stairs.some(
        (entry) =>
          !isRecord(entry) ||
          !isCoordinateInMap(entry, width, height) ||
          (entry.direction !== 'left' && entry.direction !== 'right')
      ))
  ) {
    return { ok: false, errors: ['stairs must be in bounds with a known direction'] }
  }
  const decorations = value.decorations
  if (
    decorations !== undefined &&
    (!Array.isArray(decorations) ||
      decorations.some(
        (entry) =>
          !isRecord(entry) ||
          !isCoordinateInMap(entry, width, height) ||
          !DRESSING_KINDS.includes(entry.kind as DressingKind) ||
          (entry.variant !== undefined && (!isInteger(entry.variant) || entry.variant < 0))
      ))
  ) {
    return { ok: false, errors: ['decorations must be in bounds with known kinds'] }
  }
  if (value.palette !== undefined && typeof value.palette !== 'string') {
    return { ok: false, errors: ['palette must be a string'] }
  }
  if (value.decorationSeed !== undefined && !isInteger(value.decorationSeed)) {
    return { ok: false, errors: ['decorationSeed must be an integer'] }
  }
  if (
    value.decorationCounts !== undefined &&
    (!isRecord(value.decorationCounts) ||
      Object.entries(value.decorationCounts).some(
        ([kind, count]) => !DRESSING_KINDS.includes(kind as DressingKind) || !isInteger(count) || count < 0
      ))
  ) {
    return { ok: false, errors: ['decorationCounts must contain non-negative known counts'] }
  }
  return {
    ok: true,
    map: {
      width,
      height,
      tiles: [...value.tiles] as MapTileKind[],
      ...(Array.isArray(stairs)
        ? {
            stairs: stairs.map((entry) => ({
              x: (entry as StairEntry).x,
              y: (entry as StairEntry).y,
              direction: (entry as StairEntry).direction
            }))
          }
        : {}),
      ...(typeof value.palette === 'string' ? { palette: value.palette } : {}),
      ...(isInteger(value.decorationSeed) ? { decorationSeed: value.decorationSeed } : {}),
      ...(Array.isArray(decorations)
        ? { decorations: decorations.map((entry) => ({ ...(entry as DecorationPlacement) })) }
        : {}),
      ...(isRecord(value.decorationCounts)
        ? { decorationCounts: { ...(value.decorationCounts as Partial<Record<DressingKind, number>>) } }
        : {})
    }
  }
}
export function tileAt(map: MapDefinition, index: number): MapTileKind {
  const tile = map.tiles[index]
  if (tile === undefined) {
    throw new Error(`tileAt: index ${index} outside map ${map.width}x${map.height}`)
  }
  return tile
}
export function tileAtPosition(map: MapDefinition, x: number, y: number): MapTileKind | null {
  return x < 0 || y < 0 || x >= map.width || y >= map.height ? null : (map.tiles[tileIndex(map.width, x, y)] ?? null)
}
