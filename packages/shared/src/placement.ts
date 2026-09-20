import type { MapDefinition, MapTileKind, TileCoordinate } from './map.js'

export type { TileCoordinate }
export interface PlacementMapBounds {
  readonly width: number
  readonly height: number
  readonly invalidTiles?: readonly TileCoordinate[]
}
export interface BuildingFootprint extends TileCoordinate {
  readonly width: number
  readonly height: number
}
export type PlacementFailureReason = 'OUT_OF_BOUNDS' | 'INVALID_TILE' | 'OVERLAP' | 'INVALID_FOOTPRINT'
export type PlacementResult = { readonly ok: true } | { readonly ok: false; readonly reason: PlacementFailureReason }
export function isBuildableTile(tile: MapTileKind): boolean {
  return tile === 'land' || tile === 'elevated'
}
export function placementBoundsFromMap(map: MapDefinition): PlacementMapBounds {
  const invalidTiles: TileCoordinate[] = []
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      if (!isBuildableTile(map.tiles[y * map.width + x]!)) {
        invalidTiles.push({ x, y })
      }
    }
  }
  return { width: map.width, height: map.height, ...(invalidTiles.length > 0 ? { invalidTiles } : {}) }
}
function overlaps(a: BuildingFootprint, b: BuildingFootprint): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}
export function validateBuildingPlacement(
  bounds: PlacementMapBounds,
  occupied: readonly BuildingFootprint[],
  candidate: BuildingFootprint
): PlacementResult {
  if (!Number.isInteger(bounds.width) || !Number.isInteger(bounds.height) || bounds.width <= 0 || bounds.height <= 0) {
    throw new Error('validateBuildingPlacement: map bounds must be positive integers')
  }
  if (
    !Number.isInteger(candidate.width) ||
    !Number.isInteger(candidate.height) ||
    candidate.width <= 0 ||
    candidate.height <= 0
  ) {
    return { ok: false, reason: 'INVALID_FOOTPRINT' }
  }
  if (!Number.isInteger(candidate.x) || !Number.isInteger(candidate.y)) {
    return { ok: false, reason: 'INVALID_TILE' }
  }
  if (
    candidate.x < 0 ||
    candidate.y < 0 ||
    candidate.x + candidate.width > bounds.width ||
    candidate.y + candidate.height > bounds.height
  ) {
    return { ok: false, reason: 'OUT_OF_BOUNDS' }
  }
  const invalid = new Set((bounds.invalidTiles ?? []).map((tile) => `${tile.x},${tile.y}`))
  for (let y = candidate.y; y < candidate.y + candidate.height; y += 1) {
    for (let x = candidate.x; x < candidate.x + candidate.width; x += 1) {
      if (invalid.has(`${x},${y}`)) {
        return { ok: false, reason: 'INVALID_TILE' }
      }
    }
  }
  return occupied.some((footprint) => overlaps(footprint, candidate)) ? { ok: false, reason: 'OVERLAP' } : { ok: true }
}
