import type { NavigationGrid } from '@rts/pathfinding'
import type { EntityId, TileCoordinate } from '@rts/shared'
import { MAX_UNITS_PER_COMMAND } from '../commands/limits.js'

export interface FormationOffset {
  readonly dx: number
  readonly dy: number
}

export interface GroupDestination {
  readonly unitId: EntityId
  readonly tile: TileCoordinate
}

export const FORMATION_SPACING = 128

/**
 * Builds the deterministic formation spiral: unit 0 lands on the target and
 * each following ring is walked clockwise (right column, top row, left column,
 * bottom row). Ring order is fixed, so the same index always yields the same
 * offset regardless of call site (deterministic group movement).
 */
function buildSpiral(count: number): readonly FormationOffset[] {
  const offsets: FormationOffset[] = [{ dx: 0, dy: 0 }]
  let ring = 1
  while (offsets.length < count) {
    const push = (x: number, y: number): void => {
      offsets.push({ dx: x, dy: y })
    }
    for (let y = -(ring - 1); y <= ring; y += 1) {
      push(ring, y)
    }
    for (let x = ring - 1; x >= -ring; x -= 1) {
      push(x, ring)
    }
    for (let y = ring - 1; y >= -ring; y -= 1) {
      push(-ring, y)
    }
    for (let x = -ring + 1; x <= ring; x += 1) {
      push(x, -ring)
    }
    ring += 1
  }
  return offsets.slice(0, count)
}

const SPIRAL = buildSpiral(MAX_UNITS_PER_COMMAND)

export function formationOffset(index: number): FormationOffset {
  const offset = formationTileOffset(index)
  return {
    dx: (offset.dx || 0) * FORMATION_SPACING,
    dy: (offset.dy || 0) * FORMATION_SPACING
  }
}

export function formationTileOffset(index: number): FormationOffset {
  return SPIRAL[index] ?? { dx: 0, dy: 0 }
}

export function resolveGroupDestinations(
  grid: NavigationGrid,
  unitIds: readonly EntityId[],
  target: TileCoordinate
): readonly GroupDestination[] {
  const sortedUnitIds = [...new Set(unitIds)].sort((left, right) => left - right)
  const destinations: GroupDestination[] = []
  const usedTiles = new Set<number>()
  let candidateIndex = 0
  for (const unitId of sortedUnitIds) {
    while (candidateIndex < SPIRAL.length) {
      const offset = formationTileOffset(candidateIndex)
      candidateIndex += 1
      const tile = { x: target.x + offset.dx, y: target.y + offset.dy }
      const tileIndex = grid.tileIndex(tile)
      if (tileIndex === null || !grid.isWalkable(tile) || usedTiles.has(tileIndex)) {
        continue
      }
      usedTiles.add(tileIndex)
      destinations.push(Object.freeze({ unitId, tile: Object.freeze(tile) }))
      break
    }
  }
  return Object.freeze(destinations)
}
