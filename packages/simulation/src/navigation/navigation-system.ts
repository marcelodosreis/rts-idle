import { advanceIncrementalSearch, invalidateIncrementalSearch } from '@rts/pathfinding'
import type { TileCoordinate } from '@rts/shared'
import { Building } from '../ecs/building-component.js'
import { Movement } from '../ecs/components.js'
import type { GameState } from '../state/state.js'
import {
  NAVIGATION_SEARCH_SLICE,
  type NavigationRequestState,
  navigationSliceCount,
  syncNavigationFootprintTiles
} from './navigation-state.js'

function compareRequests(left: NavigationRequestState, right: NavigationRequestState): number {
  return left.state.requestId - right.state.requestId
}

function hasPendingRequest(requests: readonly NavigationRequestState[]): boolean {
  return requests.some((request) => request.state.status === 'PENDING')
}

function buildingFootprintTiles(state: GameState): readonly TileCoordinate[] {
  const buildings = state.world.store(Building)
  const tiles: TileCoordinate[] = []
  for (const id of state.world.query(Building)) {
    const footprint = buildings.get(id)?.footprint
    if (footprint === undefined) {
      continue
    }
    for (let y = footprint.y; y < footprint.y + footprint.height; y += 1) {
      for (let x = footprint.x; x < footprint.x + footprint.width; x += 1) {
        tiles.push({ x, y })
      }
    }
  }
  return tiles
}

function invalidateChangedSearches(state: GameState): void {
  for (const request of state.navigation.requests) {
    if (request.state.status !== 'PENDING' && request.state.status !== 'FOUND') {
      continue
    }
    request.state = invalidateIncrementalSearch(request.state, 'NAVIGATION_CHANGED')
    request.availableTick = state.tick
  }
}

function resetMovementRoutes(state: GameState): void {
  const movements = state.world.store(Movement)
  for (const id of state.world.query(Movement)) {
    const movement = movements.get(id)
    if (movement === undefined || movement.path === null) {
      continue
    }
    movements.set(id, { ...movement, path: null, pathIndex: 0, blockedTicks: 0 })
  }
}

/** Advances navigation before movement while preserving the frozen system list. */
export function navigationSystem(state: GameState): void {
  if (syncNavigationFootprintTiles(state.navigation, buildingFootprintTiles(state))) {
    invalidateChangedSearches(state)
    resetMovementRoutes(state)
  }
  const requests = [...state.navigation.requests].sort(compareRequests)
  if (!hasPendingRequest(requests)) {
    return
  }
  let cursor = requests.length === 0 ? 0 : state.navigation.roundRobinCursor % requests.length
  for (let slice = 0; slice < navigationSliceCount(); slice += 1) {
    const request = requests[cursor]
    if (request?.state.status === 'PENDING') {
      const next = advanceIncrementalSearch(state.navigation.grid, request.state, NAVIGATION_SEARCH_SLICE)
      request.state = next
      if (next.status !== 'PENDING') {
        request.availableTick = state.tick
      }
    }
    cursor = requests.length === 0 ? 0 : (cursor + 1) % requests.length
    if (!hasPendingRequest(requests)) {
      break
    }
  }
  state.navigation.roundRobinCursor = cursor
}
