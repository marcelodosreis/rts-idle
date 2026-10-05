import type { TileCoordinate } from '@rts/shared'
import { DIAGONAL_NAVIGATION_COST, type NavigationGrid, ORTHOGONAL_NAVIGATION_COST } from './grid.js'

export interface OpenEntry {
  readonly tileIndex: number
  readonly g: number
  readonly h: number
  readonly f: number
}

export interface ResolvedDestination {
  readonly tileIndex: number
  readonly coordinate: TileCoordinate
}

export function octileDistance(from: TileCoordinate, to: TileCoordinate): number {
  const deltaX = Math.abs(from.x - to.x)
  const deltaY = Math.abs(from.y - to.y)
  const diagonal = Math.min(deltaX, deltaY)
  const straight = Math.max(deltaX, deltaY) - diagonal
  return diagonal * DIAGONAL_NAVIGATION_COST + straight * ORTHOGONAL_NAVIGATION_COST
}

export function compareOpenEntries(left: OpenEntry, right: OpenEntry): number {
  if (left.f !== right.f) {
    return left.f - right.f
  }
  if (left.h !== right.h) {
    return left.h - right.h
  }
  return left.tileIndex - right.tileIndex
}

export function resolveDestination(grid: NavigationGrid, requested: TileCoordinate): ResolvedDestination | null {
  let best: ResolvedDestination | null = null
  let bestDistance = Number.MAX_SAFE_INTEGER
  for (let tileIndex = 0; tileIndex < grid.width * grid.height; tileIndex += 1) {
    const coordinate = grid.coordinateFromTileIndex(tileIndex)
    if (coordinate === null || !grid.isWalkable(coordinate)) {
      continue
    }
    const distance = octileDistance(coordinate, requested)
    if (distance < bestDistance || (distance === bestDistance && (best === null || tileIndex < best.tileIndex))) {
      best = { tileIndex, coordinate }
      bestDistance = distance
    }
  }
  return best
}
