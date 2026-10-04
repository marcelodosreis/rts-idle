export const version = '0.1.0'

export type {
  AStarFoundPath,
  AStarInvalidPath,
  AStarInvalidReason,
  AStarResult,
  AStarResultStatus,
  AStarUnreachablePath
} from './astar.js'
export { A_STAR_INVALID_REASONS, A_STAR_RESULTS, findPath } from './astar.js'
export type { NavigationDirection, NavigationGrid, NavigationGridOptions, NavigationNeighbor } from './grid.js'
export {
  createNavigationGrid,
  createNavigationGridFromMap,
  DIAGONAL_NAVIGATION_COST,
  MAX_NAVIGATION_TILES,
  NAVIGATION_DIRECTIONS,
  ORTHOGONAL_NAVIGATION_COST
} from './grid.js'
export type {
  FoundIncrementalSearch,
  IncrementalInvalidationReason,
  IncrementalSearchResultStatus,
  IncrementalSearchState,
  InvalidatedIncrementalSearch,
  PendingIncrementalSearch,
  SearchParent,
  SearchScore,
  UnreachableIncrementalSearch
} from './incremental.js'
export {
  advanceIncrementalSearch,
  createIncrementalSearch,
  INCREMENTAL_INVALIDATION_REASONS,
  INCREMENTAL_SEARCH_RESULTS,
  invalidateIncrementalSearch
} from './incremental.js'
export type { OpenEntry } from './search-geometry.js'
export type { SpatialBounds, SpatialIndex, SpatialIndexEntry, SpatialIndexOptions } from './spatial-index.js'
export { createSpatialIndex } from './spatial-index.js'
