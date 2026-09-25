import { field, isInteger, isRecord } from '../primitives/parse.js'

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
export const STAIR_DIRECTIONS = ['left', 'right'] as const
export type StairDirection = (typeof STAIR_DIRECTIONS)[number]
export interface StairEntry extends TileCoordinate {
  readonly direction: StairDirection
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

export function isTileKind(value: unknown): value is MapTileKind {
  return typeof value === 'string' && (MAP_TILE_KINDS as readonly string[]).includes(value)
}

export function isDressingKind(value: unknown): value is DressingKind {
  return typeof value === 'string' && (DRESSING_KINDS as readonly string[]).includes(value)
}

function isCoordinateInMap(value: Record<string, unknown>, width: number, height: number): boolean {
  const x = field(value, 'x')
  const y = field(value, 'y')
  return isInteger(x) && isInteger(y) && x >= 0 && y >= 0 && x < width && y < height
}

function validateStairsField(stairs: unknown, width: number, height: number): boolean {
  return (
    stairs === undefined ||
    (Array.isArray(stairs) &&
      stairs.every(
        (entry) =>
          isRecord(entry) &&
          isCoordinateInMap(entry, width, height) &&
          (field(entry, 'direction') === 'left' || field(entry, 'direction') === 'right')
      ))
  )
}

function validateDecorationsField(decorations: unknown, width: number, height: number): string | null {
  if (decorations === undefined) {
    return null
  }
  if (!Array.isArray(decorations)) {
    return 'decorations must be an array'
  }
  for (let index = 0; index < decorations.length; index += 1) {
    const entry = decorations[index]
    if (!isRecord(entry) || !isCoordinateInMap(entry, width, height) || !isDressingKind(field(entry, 'kind'))) {
      return `decorations[${index}] must be { x, y, kind }`
    }
    const variant = field(entry, 'variant')
    if (variant !== undefined && (!isInteger(variant) || variant < 0)) {
      return `decorations[${index}].variant must be a non-negative integer`
    }
  }
  return null
}

function validateOptionalFields(value: Record<string, unknown>): string | null {
  const palette = field(value, 'palette')
  if (palette !== undefined && typeof palette !== 'string') {
    return 'palette must be a string'
  }
  const decorationSeed = field(value, 'decorationSeed')
  if (decorationSeed !== undefined && !isInteger(decorationSeed)) {
    return 'decorationSeed must be an integer'
  }
  const decorationCounts = field(value, 'decorationCounts')
  if (decorationCounts !== undefined && !isRecord(decorationCounts)) {
    return 'decorationCounts must be an object'
  }
  if (isRecord(decorationCounts)) {
    for (const [kind, count] of Object.entries(decorationCounts)) {
      if (!isDressingKind(kind)) {
        return `decorationCounts.${kind} is not a known decoration kind`
      }
      if (!isInteger(count) || count < 0) {
        return `decorationCounts.${kind} must be a non-negative integer`
      }
    }
  }
  return null
}

function buildMapDefinition(
  value: Record<string, unknown>,
  width: number,
  height: number,
  tiles: readonly unknown[]
): MapDefinition {
  const stairs = field(value, 'stairs')
  const decorations = field(value, 'decorations')
  const decorationCounts = field(value, 'decorationCounts')
  const palette = field(value, 'palette')
  const decorationSeed = field(value, 'decorationSeed')
  return {
    width,
    height,
    tiles: [...tiles] as MapTileKind[],
    ...(Array.isArray(stairs)
      ? {
          stairs: stairs.map((entry) => ({
            x: (entry as StairEntry).x,
            y: (entry as StairEntry).y,
            direction: (entry as StairEntry).direction
          }))
        }
      : {}),
    ...(typeof palette === 'string' ? { palette } : {}),
    ...(isInteger(decorationSeed) ? { decorationSeed } : {}),
    ...(Array.isArray(decorations)
      ? { decorations: decorations.map((entry) => ({ ...(entry as DecorationPlacement) })) }
      : {}),
    ...(isRecord(decorationCounts)
      ? { decorationCounts: { ...(decorationCounts as Partial<Record<DressingKind, number>>) } }
      : {})
  }
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
  const width = field(value, 'width')
  const height = field(value, 'height')
  if (!isInteger(width) || width < 1) {
    return { ok: false, errors: ['width must be a positive integer'] }
  }
  if (!isInteger(height) || height < 1) {
    return { ok: false, errors: ['height must be a positive integer'] }
  }
  if (width > MAX_MAP_DIMENSION || height > MAX_MAP_DIMENSION || width * height > MAX_MAP_TILES) {
    return { ok: false, errors: ['map dimensions are outside supported bounds'] }
  }
  const tiles = field(value, 'tiles')
  if (!Array.isArray(tiles)) {
    return { ok: false, errors: ['tiles must be an array'] }
  }
  if (tiles.length !== width * height) {
    return { ok: false, errors: [`tiles must have ${width * height} entries (width × height)`] }
  }
  const invalidTileIndex = tiles.findIndex((tile) => !isTileKind(tile))
  if (invalidTileIndex >= 0) {
    return { ok: false, errors: [`tiles[${invalidTileIndex}] must be water, land, or elevated`] }
  }
  if (!validateStairsField(field(value, 'stairs'), width, height)) {
    return { ok: false, errors: ['stairs must be in bounds with a known direction'] }
  }
  const decorationsError = validateDecorationsField(field(value, 'decorations'), width, height)
  if (decorationsError !== null) {
    return { ok: false, errors: [decorationsError] }
  }
  const optionalError = validateOptionalFields(value)
  if (optionalError !== null) {
    return { ok: false, errors: [optionalError] }
  }
  return { ok: true, map: buildMapDefinition(value, width, height, tiles) }
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
