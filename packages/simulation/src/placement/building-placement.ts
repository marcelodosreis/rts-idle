export interface TileCoordinate {
  readonly x: number
  readonly y: number
}

export interface PlacementMapBounds {
  readonly width: number
  readonly height: number
  /** Cells unavailable for buildings. Coordinates are zero-based map tiles. */
  readonly invalidTiles?: readonly TileCoordinate[]
}

export interface BuildingFootprint {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export type PlacementFailureReason = 'OUT_OF_BOUNDS' | 'INVALID_TILE' | 'OVERLAP' | 'INVALID_FOOTPRINT'

export type PlacementResult = { readonly ok: true } | { readonly ok: false; readonly reason: PlacementFailureReason }

function isInteger(value: number): boolean {
  return Number.isInteger(value)
}

function hasValidDimensions(footprint: BuildingFootprint): boolean {
  return isInteger(footprint.width) && footprint.width > 0 && isInteger(footprint.height) && footprint.height > 0
}

function hasIntegerOrigin(footprint: BuildingFootprint): boolean {
  return isInteger(footprint.x) && isInteger(footprint.y)
}

function isWithinBounds(bounds: PlacementMapBounds, footprint: BuildingFootprint): boolean {
  return (
    footprint.x >= 0 &&
    footprint.y >= 0 &&
    footprint.x + footprint.width <= bounds.width &&
    footprint.y + footprint.height <= bounds.height
  )
}

function key(tile: TileCoordinate): string {
  return `${tile.x},${tile.y}`
}

function containsInvalidTile(bounds: PlacementMapBounds, footprint: BuildingFootprint): boolean {
  const invalidTiles = new Set((bounds.invalidTiles ?? []).map(key))
  for (let y = footprint.y; y < footprint.y + footprint.height; y += 1) {
    for (let x = footprint.x; x < footprint.x + footprint.width; x += 1) {
      if (invalidTiles.has(`${x},${y}`)) {
        return true
      }
    }
  }
  return false
}

function overlaps(first: BuildingFootprint, second: BuildingFootprint): boolean {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  )
}

function validateMapBounds(bounds: PlacementMapBounds): void {
  if (!isInteger(bounds.width) || bounds.width <= 0 || !isInteger(bounds.height) || bounds.height <= 0) {
    throw new Error('validateBuildingPlacement: map bounds must be positive integers')
  }
}

/**
 * Validates a candidate without changing any simulation or map state.
 * Rectangles use half-open bounds so buildings that only touch are allowed.
 */
export function validateBuildingPlacement(
  mapBounds: PlacementMapBounds,
  occupiedFootprints: readonly BuildingFootprint[],
  candidateFootprint: BuildingFootprint
): PlacementResult {
  validateMapBounds(mapBounds)

  if (!hasValidDimensions(candidateFootprint)) {
    return { ok: false, reason: 'INVALID_FOOTPRINT' }
  }
  if (!hasIntegerOrigin(candidateFootprint)) {
    return { ok: false, reason: 'INVALID_TILE' }
  }
  if (!isWithinBounds(mapBounds, candidateFootprint)) {
    return { ok: false, reason: 'OUT_OF_BOUNDS' }
  }
  if (containsInvalidTile(mapBounds, candidateFootprint)) {
    return { ok: false, reason: 'INVALID_TILE' }
  }
  if (occupiedFootprints.some((occupied) => overlaps(occupied, candidateFootprint))) {
    return { ok: false, reason: 'OVERLAP' }
  }
  return { ok: true }
}
