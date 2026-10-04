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

export const INCREMENTAL_SEARCH_RESULTS = ['PENDING', 'FOUND', 'UNREACHABLE', 'INVALIDATED'] as const
export type IncrementalSearchResultStatus = (typeof INCREMENTAL_SEARCH_RESULTS)[number]

export const INCREMENTAL_INVALIDATION_REASONS = [
  'NAVIGATION_CHANGED',
  'START_OUT_OF_BOUNDS',
  'START_BLOCKED',
  'NO_DESTINATION'
] as const
export type IncrementalInvalidationReason = (typeof INCREMENTAL_INVALIDATION_REASONS)[number]

export interface SearchScore {
  readonly tileIndex: number
  readonly g: number
}

export interface SearchParent {
  readonly tileIndex: number
  readonly parentTileIndex: number
}

interface SearchIdentity {
  readonly requestId: number
  readonly startTileIndex: number | null
  readonly destinationTileIndex: number | null
  readonly destination: TileCoordinate | null
}

export interface PendingIncrementalSearch extends SearchIdentity {
  readonly status: 'PENDING'
  readonly expanded: number
  readonly open: readonly OpenEntry[]
  readonly scores: readonly SearchScore[]
  readonly parents: readonly SearchParent[]
  readonly closed: readonly number[]
}

export interface FoundIncrementalSearch extends SearchIdentity {
  readonly status: 'FOUND'
  readonly expanded: number
  readonly path: readonly number[]
  readonly cost: number
}

export interface UnreachableIncrementalSearch extends SearchIdentity {
  readonly status: 'UNREACHABLE'
  readonly expanded: number
}

export interface InvalidatedIncrementalSearch extends SearchIdentity {
  readonly status: 'INVALIDATED'
  readonly expanded: number
  readonly reason: IncrementalInvalidationReason
}

export type IncrementalSearchState =
  | PendingIncrementalSearch
  | FoundIncrementalSearch
  | UnreachableIncrementalSearch
  | InvalidatedIncrementalSearch

function validateRequestId(requestId: number): void {
  if (!Number.isInteger(requestId) || requestId < 0) {
    throw new Error('incremental search request id must be a non-negative integer')
  }
}

function validateBudget(expansionBudget: number): void {
  if (!Number.isInteger(expansionBudget) || expansionBudget < 0) {
    throw new Error('incremental search budget must be a non-negative integer')
  }
}

function createInvalidated(
  identity: SearchIdentity,
  reason: IncrementalInvalidationReason,
  expanded = 0
): InvalidatedIncrementalSearch {
  return Object.freeze({ ...identity, status: 'INVALIDATED', expanded, reason })
}

function identityFor(
  requestId: number,
  startTileIndex: number | null,
  destination: ResolvedDestination | null
): SearchIdentity {
  return {
    requestId,
    startTileIndex,
    destinationTileIndex: destination?.tileIndex ?? null,
    destination: destination === null ? null : Object.freeze({ ...destination.coordinate })
  }
}

function sortScores(scores: Map<number, number>): readonly SearchScore[] {
  return Object.freeze(
    [...scores.entries()]
      .map(([tileIndex, g]) => ({ tileIndex, g }))
      .sort((left, right) => left.tileIndex - right.tileIndex)
  )
}

function sortParents(parents: Map<number, number>): readonly SearchParent[] {
  return Object.freeze(
    [...parents.entries()]
      .map(([tileIndex, parentTileIndex]) => ({ tileIndex, parentTileIndex }))
      .sort((left, right) => left.tileIndex - right.tileIndex)
  )
}

function sortedNumbers(values: Set<number>): readonly number[] {
  return Object.freeze([...values].sort((left, right) => left - right))
}

interface PendingCollections {
  readonly open: readonly OpenEntry[]
  readonly scores: Map<number, number>
  readonly parents: Map<number, number>
  readonly closed: Set<number>
}

function pendingState(
  identity: SearchIdentity,
  expanded: number,
  collections: PendingCollections
): PendingIncrementalSearch {
  return Object.freeze({
    ...identity,
    status: 'PENDING',
    expanded,
    open: Object.freeze([...collections.open]),
    scores: sortScores(collections.scores),
    parents: sortParents(collections.parents),
    closed: sortedNumbers(collections.closed)
  })
}

function reconstructPath(parents: ReadonlyMap<number, number>, start: number, goal: number): readonly number[] {
  const path = [goal]
  let current = goal
  while (current !== start) {
    const parent = parents.get(current)
    if (parent === undefined) {
      throw new Error('incremental search path has no parent for a reachable tile')
    }
    path.push(parent)
    current = parent
  }
  return Object.freeze(path.reverse())
}

function mapsFromState(state: PendingIncrementalSearch): {
  readonly scores: Map<number, number>
  readonly parents: Map<number, number>
  readonly closed: Set<number>
} {
  return {
    scores: new Map(state.scores.map((entry) => [entry.tileIndex, entry.g])),
    parents: new Map(state.parents.map((entry) => [entry.tileIndex, entry.parentTileIndex])),
    closed: new Set(state.closed)
  }
}

function finishFound(
  state: PendingIncrementalSearch,
  current: OpenEntry,
  parents: ReadonlyMap<number, number>
): FoundIncrementalSearch {
  return Object.freeze({
    requestId: state.requestId,
    startTileIndex: state.startTileIndex,
    destinationTileIndex: state.destinationTileIndex,
    destination: state.destination,
    status: 'FOUND',
    expanded: state.expanded,
    path: reconstructPath(parents, state.startTileIndex!, current.tileIndex),
    cost: current.g
  })
}

export function createIncrementalSearch(
  grid: NavigationGrid,
  requestId: number,
  start: TileCoordinate,
  requestedDestination: TileCoordinate
): IncrementalSearchState {
  validateRequestId(requestId)
  const startTileIndex = grid.tileIndex(start)
  const destination = resolveDestination(grid, requestedDestination)
  const identity = identityFor(requestId, startTileIndex, destination)
  if (startTileIndex === null) {
    return createInvalidated(identity, 'START_OUT_OF_BOUNDS')
  }
  if (!grid.isWalkable(start)) {
    return createInvalidated(identity, 'START_BLOCKED')
  }
  if (destination === null) {
    return createInvalidated(identity, 'NO_DESTINATION')
  }
  const h = octileDistance(start, destination.coordinate)
  const open: OpenEntry = { tileIndex: startTileIndex, g: 0, h, f: h }
  return pendingState(identity, 0, {
    open: [open],
    scores: new Map([[startTileIndex, 0]]),
    parents: new Map(),
    closed: new Set()
  })
}

export function advanceIncrementalSearch(
  grid: NavigationGrid,
  state: IncrementalSearchState,
  expansionBudget: number
): IncrementalSearchState {
  validateBudget(expansionBudget)
  if (state.status !== 'PENDING' || expansionBudget === 0) {
    return state
  }
  const destination = state.destination
  const destinationTileIndex = state.destinationTileIndex
  const startTileIndex = state.startTileIndex
  if (destination === null || destinationTileIndex === null || startTileIndex === null) {
    return createInvalidated(state, 'NO_DESTINATION', state.expanded)
  }
  const maps = mapsFromState(state)
  const open = createMinHeap<OpenEntry>(compareOpenEntries, state.open)
  let expanded = state.expanded
  let budgetUsed = 0
  while (budgetUsed < expansionBudget) {
    const current = open.pop()
    if (current === undefined) {
      return Object.freeze({
        requestId: state.requestId,
        startTileIndex,
        destinationTileIndex,
        destination,
        status: 'UNREACHABLE',
        expanded
      })
    }
    if (maps.closed.has(current.tileIndex) || maps.scores.get(current.tileIndex) !== current.g) {
      continue
    }
    maps.closed.add(current.tileIndex)
    expanded += 1
    budgetUsed += 1
    if (current.tileIndex === destinationTileIndex) {
      return finishFound({ ...state, expanded }, current, maps.parents)
    }
    const coordinate = grid.coordinateFromTileIndex(current.tileIndex)
    if (coordinate === null) {
      return createInvalidated(state, 'NAVIGATION_CHANGED', expanded)
    }
    for (const neighbor of grid.neighbors(coordinate)) {
      if (maps.closed.has(neighbor.tileIndex)) {
        continue
      }
      const nextG = current.g + neighbor.cost
      const previousG = maps.scores.get(neighbor.tileIndex)
      if (previousG !== undefined && nextG >= previousG) {
        continue
      }
      const h = octileDistance(neighbor.coordinate, destination)
      maps.scores.set(neighbor.tileIndex, nextG)
      maps.parents.set(neighbor.tileIndex, current.tileIndex)
      open.push({ tileIndex: neighbor.tileIndex, g: nextG, h, f: nextG + h })
    }
  }
  return pendingState(state, expanded, {
    open: open.toArray(),
    scores: maps.scores,
    parents: maps.parents,
    closed: maps.closed
  })
}

export function invalidateIncrementalSearch(
  state: IncrementalSearchState,
  reason: IncrementalInvalidationReason
): InvalidatedIncrementalSearch {
  return createInvalidated(
    {
      requestId: state.requestId,
      startTileIndex: state.startTileIndex,
      destinationTileIndex: state.destinationTileIndex,
      destination: state.destination
    },
    reason,
    state.expanded
  )
}
