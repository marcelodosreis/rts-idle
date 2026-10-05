import {
  createIncrementalSearch,
  createNavigationGrid,
  type IncrementalSearchState,
  type NavigationGrid
} from '@rts/pathfinding'
import { assertNever, type TileCoordinate, tileKey } from '@rts/shared'
import type { PlacementMapBounds } from '../placement/building-placement.js'

export const MAX_ACTIVE_NAVIGATION_SEARCHES = 4
export const NAVIGATION_EXPANSION_BUDGET = 4_096
export const NAVIGATION_SEARCH_SLICE = 256
const NAVIGATION_SLICES_PER_TICK = NAVIGATION_EXPANSION_BUDGET / NAVIGATION_SEARCH_SLICE

export interface NavigationGridDefinition {
  readonly width: number
  readonly height: number
  readonly blockedTiles: readonly TileCoordinate[]
}

export interface NavigationRequestInput {
  readonly start: TileCoordinate
  readonly destination: TileCoordinate
}

export interface NavigationInitialization {
  readonly blockedTiles?: readonly TileCoordinate[]
  /** Placement-reserved tiles that remain traversable for units. */
  readonly excludedTiles?: readonly TileCoordinate[]
  readonly initialRequests?: readonly NavigationRequestInput[]
}

export interface NavigationRequestState {
  readonly submittedTick: number
  availableTick: number | null
  state: IncrementalSearchState
}

export interface NavigationState {
  readonly staticDefinition: NavigationGridDefinition
  definition: NavigationGridDefinition
  grid: NavigationGrid
  readonly requests: NavigationRequestState[]
  nextRequestId: number
  roundRobinCursor: number
}

function copyCoordinate(coordinate: TileCoordinate): TileCoordinate {
  return Object.freeze({ x: coordinate.x, y: coordinate.y })
}

function copySearchState(search: IncrementalSearchState): IncrementalSearchState {
  switch (search.status) {
    case 'PENDING':
      return Object.freeze({
        ...search,
        destination: search.destination === null ? null : copyCoordinate(search.destination),
        open: Object.freeze(search.open.map((entry) => Object.freeze({ ...entry }))),
        scores: Object.freeze(search.scores.map((entry) => Object.freeze({ ...entry }))),
        parents: Object.freeze(search.parents.map((entry) => Object.freeze({ ...entry }))),
        closed: Object.freeze([...search.closed])
      })
    case 'FOUND':
      return Object.freeze({
        ...search,
        destination: search.destination === null ? null : copyCoordinate(search.destination),
        path: Object.freeze([...search.path])
      })
    case 'UNREACHABLE':
      return Object.freeze({
        ...search,
        destination: search.destination === null ? null : copyCoordinate(search.destination)
      })
    case 'INVALIDATED':
      return Object.freeze({
        ...search,
        destination: search.destination === null ? null : copyCoordinate(search.destination)
      })
    default:
      return assertNever(search)
  }
}

function copyRequest(request: NavigationRequestState): NavigationRequestState {
  return {
    submittedTick: request.submittedTick,
    availableTick: request.availableTick,
    state: copySearchState(request.state)
  }
}

function uniqueBlockedTiles(
  width: number,
  height: number,
  blockedTiles: readonly TileCoordinate[]
): readonly TileCoordinate[] {
  const grid = createNavigationGrid({ width, height, blockedTiles })
  const indexes = new Set<number>()
  for (const coordinate of blockedTiles) {
    const index = grid.tileIndex(coordinate)
    if (index === null) {
      throw new Error('navigation blocked tile must be inside the grid')
    }
    indexes.add(index)
  }
  const orderedIndexes = [...indexes].sort((left, right) => left - right)
  const normalized: TileCoordinate[] = []
  for (const index of orderedIndexes) {
    const coordinate = grid.coordinateFromTileIndex(index)
    if (coordinate === null) {
      throw new Error('navigation blocked tile index is invalid')
    }
    normalized.push(copyCoordinate(coordinate))
  }
  return Object.freeze(normalized)
}

function createDefinition(
  bounds: PlacementMapBounds,
  initialization: NavigationInitialization
): NavigationGridDefinition {
  const excluded = new Set((initialization.excludedTiles ?? []).map((tile) => tileKey(tile.x, tile.y)))
  const blockedTiles = [
    ...(bounds.invalidTiles ?? []).filter((tile) => !excluded.has(tileKey(tile.x, tile.y))),
    ...(initialization.blockedTiles ?? [])
  ]
  return normalizeDefinition({
    width: bounds.width,
    height: bounds.height,
    blockedTiles
  })
}

function normalizeDefinition(definition: NavigationGridDefinition): NavigationGridDefinition {
  return Object.freeze({
    width: definition.width,
    height: definition.height,
    blockedTiles: uniqueBlockedTiles(definition.width, definition.height, definition.blockedTiles)
  })
}

function coordinateIndex(width: number, coordinate: TileCoordinate): number {
  return coordinate.y * width + coordinate.x
}

function containsBlockedTiles(base: NavigationGridDefinition, current: NavigationGridDefinition): boolean {
  const currentIndexes = new Set(current.blockedTiles.map((tile) => coordinateIndex(current.width, tile)))
  return base.blockedTiles.every((tile) => currentIndexes.has(coordinateIndex(base.width, tile)))
}

function sameBlockedTiles(left: NavigationGridDefinition, right: NavigationGridDefinition): boolean {
  if (
    left.width !== right.width ||
    left.height !== right.height ||
    left.blockedTiles.length !== right.blockedTiles.length
  ) {
    return false
  }
  return left.blockedTiles.every(
    (tile, index) => tile.x === right.blockedTiles[index]?.x && tile.y === right.blockedTiles[index]?.y
  )
}

function createRequest(
  grid: NavigationGrid,
  requestId: number,
  input: NavigationRequestInput,
  submittedTick: number
): NavigationRequestState {
  const state = createIncrementalSearch(grid, requestId, input.start, input.destination)
  return {
    submittedTick,
    availableTick: state.status === 'PENDING' ? null : submittedTick,
    state
  }
}

interface NavigationStateValues {
  readonly staticDefinition: NavigationGridDefinition
  readonly definition: NavigationGridDefinition
  readonly grid: NavigationGrid
  readonly requests: NavigationRequestState[]
  readonly nextRequestId: number
  readonly roundRobinCursor: number
}

function createState(values: NavigationStateValues): NavigationState {
  const state: NavigationState = {
    staticDefinition: values.staticDefinition,
    definition: values.definition,
    grid: values.grid,
    requests: values.requests,
    nextRequestId: values.nextRequestId,
    roundRobinCursor: values.roundRobinCursor
  }
  Object.defineProperty(state, 'grid', { value: values.grid, enumerable: false, writable: true })
  return state
}

function validateInitialRequestCount(requests: readonly NavigationRequestInput[]): void {
  if (requests.length > MAX_ACTIVE_NAVIGATION_SEARCHES) {
    throw new Error(`navigation supports at most ${MAX_ACTIVE_NAVIGATION_SEARCHES} initial searches`)
  }
}

export function createNavigationState(
  bounds: PlacementMapBounds,
  initialization: NavigationInitialization = {}
): NavigationState {
  const initialRequests = initialization.initialRequests ?? []
  validateInitialRequestCount(initialRequests)
  const definition = createDefinition(bounds, initialization)
  const grid = createNavigationGrid(definition)
  return createState({
    staticDefinition: definition,
    definition,
    grid,
    requests: initialRequests.map((request, requestId) => createRequest(grid, requestId, request, 0)),
    nextRequestId: initialRequests.length,
    roundRobinCursor: 0
  })
}

export function createNavigationStateFromDefinition(
  staticDefinition: NavigationGridDefinition,
  definition: NavigationGridDefinition,
  requests: readonly NavigationRequestState[],
  nextRequestId: number,
  roundRobinCursor: number
): NavigationState {
  const normalizedStaticDefinition = normalizeDefinition(staticDefinition)
  const normalizedDefinition = normalizeDefinition(definition)
  if (
    normalizedStaticDefinition.width !== normalizedDefinition.width ||
    normalizedStaticDefinition.height !== normalizedDefinition.height ||
    !containsBlockedTiles(normalizedStaticDefinition, normalizedDefinition)
  ) {
    throw new Error('navigation current definition must contain the static blockers')
  }
  const grid = createNavigationGrid(normalizedDefinition)
  if (requests.length > 0 && nextRequestId <= 0) {
    throw new Error('navigation next request id must follow restored requests')
  }
  if (!Number.isInteger(roundRobinCursor) || roundRobinCursor < 0) {
    throw new Error('navigation round-robin cursor must be a non-negative integer')
  }
  return createState({
    staticDefinition: normalizedStaticDefinition,
    definition: normalizedDefinition,
    grid,
    requests: requests.map(copyRequest),
    nextRequestId,
    roundRobinCursor
  })
}

export function cloneNavigationState(state: NavigationState): NavigationState {
  return createNavigationStateFromDefinition(
    state.staticDefinition,
    state.definition,
    state.requests,
    state.nextRequestId,
    state.roundRobinCursor
  )
}

export function syncNavigationFootprintTiles(state: NavigationState, dynamicTiles: readonly TileCoordinate[]): boolean {
  const nextDefinition = normalizeDefinition({
    width: state.staticDefinition.width,
    height: state.staticDefinition.height,
    blockedTiles: [...state.staticDefinition.blockedTiles, ...dynamicTiles]
  })
  if (sameBlockedTiles(state.definition, nextDefinition)) {
    return false
  }
  state.definition = nextDefinition
  state.grid = createNavigationGrid(nextDefinition)
  return true
}

/** Queues a request for use by a simulation system during `step()`. */
export function enqueueNavigationRequest(
  state: NavigationState,
  input: NavigationRequestInput,
  submittedTick: number
): number | null {
  const activeCount = state.requests.filter((request) => request.state.status === 'PENDING').length
  if (activeCount >= MAX_ACTIVE_NAVIGATION_SEARCHES) {
    return null
  }
  const requestId = state.nextRequestId
  state.nextRequestId += 1
  state.requests.push(createRequest(state.grid, requestId, input, submittedTick))
  return requestId
}

export function navigationSliceCount(): number {
  return NAVIGATION_SLICES_PER_TICK
}
