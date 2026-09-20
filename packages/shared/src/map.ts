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
export function tileAt(map: MapDefinition, index: number): MapTileKind {
  const tile = map.tiles[index]
  if (tile === undefined) {
    throw new Error(`tileAt: index ${index} outside map ${map.width}x${map.height}`)
  }
  return tile
}
export function tileAtPosition(map: MapDefinition, x: number, y: number): MapTileKind | null {
  return x < 0 || y < 0 || x >= map.width || y >= map.height ? null : (map.tiles[y * map.width + x] ?? null)
}
