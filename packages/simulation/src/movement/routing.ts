import { findPath } from '@rts/pathfinding'
import { FIXED_SCALE, tilesToFixed } from '@rts/shared'
import type { MovementData, PositionData } from '../ecs/components.js'
import { UNIT_COLLISION_RADIUS_FIXED } from '../spatial/world-spatial-index.js'
import type { GameState } from '../state/state.js'
import { type MovementSegment, segmentIntersectsBounds } from './collision.js'

export const MOVEMENT_BLOCK_NOTIFICATION_TICKS = 20
export const MOVEMENT_PATH_RETRY_TICKS = 20

function tileCoordinate(x: number, y: number): { readonly x: number; readonly y: number } {
  return { x: Math.floor(x / FIXED_SCALE), y: Math.floor(y / FIXED_SCALE) }
}

function pathTileCoordinate(
  state: GameState,
  movement: MovementData
): { readonly x: number; readonly y: number } | null {
  if (movement.path === null || movement.path.length === 0) {
    return null
  }
  const tileIndex = movement.path[Math.min(movement.pathIndex, movement.path.length - 1)]
  return tileIndex === undefined ? null : state.navigation.grid.coordinateFromTileIndex(tileIndex)
}

export function movementTarget(state: GameState, movement: MovementData): { readonly x: number; readonly y: number } {
  if (movement.path !== null && movement.pathIndex >= movement.path.length - 1) {
    return { x: movement.destX, y: movement.destY }
  }
  const tile = pathTileCoordinate(state, movement)
  return tile === null ? { x: movement.destX, y: movement.destY } : { x: tilesToFixed(tile.x), y: tilesToFixed(tile.y) }
}

export function planMovementRoute(state: GameState, position: PositionData, movement: MovementData): MovementData {
  const start = tileCoordinate(position.x, position.y)
  const destination = tileCoordinate(movement.destX, movement.destY)
  if (!state.navigation.grid.isInBounds(start) || !state.navigation.grid.isInBounds(destination)) {
    return { ...movement, path: [], pathIndex: 0 }
  }
  const result = findPath(state.navigation.grid, start, destination)
  if (result.status !== 'FOUND' || result.path.length <= 1) {
    return { ...movement, path: [], pathIndex: 0 }
  }
  return { ...movement, path: result.path, pathIndex: 1, blockedTicks: 0 }
}

export function routeArrived(movement: MovementData): MovementData | null {
  if (movement.path === null || movement.path.length === 0 || movement.pathIndex >= movement.path.length - 1) {
    return null
  }
  return { ...movement, pathIndex: movement.pathIndex + 1, blockedTicks: 0, remainderX: 0, remainderY: 0 }
}

export function retryRoute(movement: MovementData): MovementData {
  return { ...movement, path: null, pathIndex: 0, blockedTicks: 0 }
}

export function blockedMovement(movement: MovementData): MovementData {
  return { ...movement, blockedTicks: movement.blockedTicks + 1 }
}

export function segmentHitsStaticObstacle(state: GameState, segment: MovementSegment): boolean {
  return state.navigation.staticDefinition.blockedTiles.some((tile) =>
    segmentIntersectsBounds(
      segment,
      {
        minX: tile.x * FIXED_SCALE,
        minY: tile.y * FIXED_SCALE,
        maxX: (tile.x + 1) * FIXED_SCALE,
        maxY: (tile.y + 1) * FIXED_SCALE
      },
      UNIT_COLLISION_RADIUS_FIXED
    )
  )
}

export function routeIsStale(state: GameState, position: PositionData, movement: MovementData): boolean {
  const target = movementTarget(state, movement)
  return segmentHitsStaticObstacle(state, {
    fromX: position.x,
    fromY: position.y,
    toX: target.x,
    toY: target.y
  })
}
