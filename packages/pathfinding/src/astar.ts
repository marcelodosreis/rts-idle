import type { TileCoordinate } from '@rts/shared'
import type { NavigationGrid } from './grid.js'
import { createMinHeap } from './heap.js'
import {
  compareOpenEntries,
  type OpenEntry,
  octileDistance,
  type ResolvedDestination,
  resolveDestination
} from './search-geometry.js'

export const A_STAR_RESULTS = ['FOUND', 'UNREACHABLE', 'INVALID'] as const
export type AStarResultStatus = (typeof A_STAR_RESULTS)[number]

export const A_STAR_INVALID_REASONS = ['START_OUT_OF_BOUNDS', 'START_BLOCKED', 'NO_DESTINATION'] as const
export type AStarInvalidReason = (typeof A_STAR_INVALID_REASONS)[number]

export interface AStarFoundPath {
  readonly status: 'FOUND'
  readonly path: readonly number[]
  readonly cost: number
  readonly expanded: number
  readonly destination: TileCoordinate
}

export interface AStarUnreachablePath {
  readonly status: 'UNREACHABLE'
  readonly expanded: number
  readonly destination: TileCoordinate
}

export interface AStarInvalidPath {
  readonly status: 'INVALID'
  readonly reason: AStarInvalidReason
  readonly expanded: 0
}

export type AStarResult = AStarFoundPath | AStarUnreachablePath | AStarInvalidPath

function isIntegerCoordinate(coordinate: TileCoordinate): boolean {
  return Number.isInteger(coordinate.x) && Number.isInteger(coordinate.y)
}

function reconstructPath(parents: ReadonlyMap<number, number>, start: number, goal: number): readonly number[] {
  const path = [goal]
  let current = goal
  while (current !== start) {
    const parent = parents.get(current)
    if (parent === undefined) {
      throw new Error('A* path has no parent for a reachable tile')
    }
    path.push(parent)
    current = parent
  }
  return Object.freeze(path.reverse())
}

function invalidResult(reason: AStarInvalidReason): AStarInvalidPath {
  return Object.freeze({ status: 'INVALID', reason, expanded: 0 })
}

function runSearch(grid: NavigationGrid, start: TileCoordinate, destination: ResolvedDestination): AStarResult {
  const startIndex = grid.tileIndex(start)
  if (startIndex === null) {
    return invalidResult('START_OUT_OF_BOUNDS')
  }
  const gScores = new Map<number, number>([[startIndex, 0]])
  const parents = new Map<number, number>()
  const closed = new Set<number>()
  const open = createMinHeap<OpenEntry>(compareOpenEntries)
  open.push({
    tileIndex: startIndex,
    g: 0,
    h: octileDistance(start, destination.coordinate),
    f: octileDistance(start, destination.coordinate)
  })
  let expanded = 0

  while (open.size > 0) {
    const current = open.pop()
    if (current === undefined || closed.has(current.tileIndex) || gScores.get(current.tileIndex) !== current.g) {
      continue
    }
    closed.add(current.tileIndex)
    expanded += 1
    if (current.tileIndex === destination.tileIndex) {
      return Object.freeze({
        status: 'FOUND',
        path: reconstructPath(parents, startIndex, destination.tileIndex),
        cost: current.g,
        expanded,
        destination: Object.freeze({ ...destination.coordinate })
      })
    }
    const coordinate = grid.coordinateFromTileIndex(current.tileIndex)
    if (coordinate === null) {
      return invalidResult('NO_DESTINATION')
    }
    for (const neighbor of grid.neighbors(coordinate)) {
      if (closed.has(neighbor.tileIndex)) {
        continue
      }
      const nextG = current.g + neighbor.cost
      const previousG = gScores.get(neighbor.tileIndex)
      if (previousG !== undefined && nextG >= previousG) {
        continue
      }
      const h = octileDistance(neighbor.coordinate, destination.coordinate)
      gScores.set(neighbor.tileIndex, nextG)
      parents.set(neighbor.tileIndex, current.tileIndex)
      open.push({ tileIndex: neighbor.tileIndex, g: nextG, h, f: nextG + h })
    }
  }

  return Object.freeze({
    status: 'UNREACHABLE',
    expanded,
    destination: Object.freeze({ ...destination.coordinate })
  })
}

export function findPath(grid: NavigationGrid, start: TileCoordinate, destination: TileCoordinate): AStarResult {
  if (!isIntegerCoordinate(start) || !grid.isInBounds(start)) {
    return invalidResult('START_OUT_OF_BOUNDS')
  }
  if (!grid.isWalkable(start)) {
    return invalidResult('START_BLOCKED')
  }
  const resolvedDestination = resolveDestination(grid, destination)
  if (resolvedDestination === null) {
    return invalidResult('NO_DESTINATION')
  }
  return runSearch(grid, start, resolvedDestination)
}
