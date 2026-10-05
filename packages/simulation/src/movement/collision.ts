import type { SpatialBounds } from '@rts/pathfinding'
import type { EntityId } from '@rts/shared'
import type { PositionData } from '../ecs/components.js'
import { UNIT_COLLISION_RADIUS_FIXED, type WorldSpatialIndex } from '../spatial/world-spatial-index.js'

export interface MovementSegment {
  readonly fromX: number
  readonly fromY: number
  readonly toX: number
  readonly toY: number
}

export interface UnitCollisionOptions {
  readonly movingId: EntityId
  readonly segment: MovementSegment
  readonly allowedDestination?: PositionData | undefined
  readonly ignoredUnitIds?: ReadonlySet<EntityId>
}

export const AVOIDANCE_OFFSETS = Object.freeze([
  { x: 0, y: 0 },
  { x: -512, y: -512 },
  { x: 512, y: -512 },
  { x: -512, y: 0 },
  { x: 512, y: 0 },
  { x: 0, y: -512 },
  { x: 0, y: 512 },
  { x: -512, y: 512 },
  { x: 512, y: 512 }
] as const)

function expandedBounds(bounds: SpatialBounds, padding: number): SpatialBounds {
  return {
    minX: bounds.minX - padding,
    minY: bounds.minY - padding,
    maxX: bounds.maxX + padding,
    maxY: bounds.maxY + padding
  }
}

export function segmentBounds(segment: MovementSegment, padding = 0): SpatialBounds {
  return {
    minX: Math.min(segment.fromX, segment.toX) - padding,
    minY: Math.min(segment.fromY, segment.toY) - padding,
    maxX: Math.max(segment.fromX, segment.toX) + padding,
    maxY: Math.max(segment.fromY, segment.toY) + padding
  }
}

function axisIntersects(
  start: number,
  delta: number,
  minimum: number,
  maximum: number,
  range: { min: number; max: number }
): boolean {
  if (delta === 0) {
    return start >= minimum && start <= maximum
  }
  const first = (minimum - start) / delta
  const second = (maximum - start) / delta
  const entry = Math.min(first, second)
  const exit = Math.max(first, second)
  range.min = Math.max(range.min, entry)
  range.max = Math.min(range.max, exit)
  return range.min <= range.max
}

export function segmentIntersectsBounds(segment: MovementSegment, bounds: SpatialBounds, padding = 0): boolean {
  const expanded = expandedBounds(bounds, padding)
  const range = { min: 0, max: 1 }
  return (
    axisIntersects(segment.fromX, segment.toX - segment.fromX, expanded.minX, expanded.maxX, range) &&
    axisIntersects(segment.fromY, segment.toY - segment.fromY, expanded.minY, expanded.maxY, range)
  )
}

export function segmentHitsBuilding(index: WorldSpatialIndex['buildings'], segment: MovementSegment): boolean {
  return index.query(segmentBounds(segment)).some((id) => {
    const bounds = index.boundsFor(id)
    return bounds !== undefined && segmentIntersectsInterior(segment, bounds)
  })
}

function segmentIntersectsInterior(segment: MovementSegment, bounds: SpatialBounds): boolean {
  const startsInsideBuilding =
    segment.fromX >= bounds.minX &&
    segment.fromX <= bounds.maxX &&
    segment.fromY >= bounds.minY &&
    segment.fromY <= bounds.maxY
  if (startsInsideBuilding) {
    return false
  }
  if (bounds.maxX - bounds.minX <= 2 || bounds.maxY - bounds.minY <= 2) {
    return segmentIntersectsBounds(segment, bounds)
  }
  return segmentIntersectsBounds(segment, {
    minX: bounds.minX + 1,
    minY: bounds.minY + 1,
    maxX: bounds.maxX - 1,
    maxY: bounds.maxY - 1
  })
}

function pointDistanceSquaredToSegment(point: PositionData, segment: MovementSegment): number {
  const dx = segment.toX - segment.fromX
  const dy = segment.toY - segment.fromY
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) {
    const offsetX = point.x - segment.fromX
    const offsetY = point.y - segment.fromY
    return offsetX * offsetX + offsetY * offsetY
  }
  const projection = (point.x - segment.fromX) * dx + (point.y - segment.fromY) * dy
  if (projection <= 0) {
    const offsetX = point.x - segment.fromX
    const offsetY = point.y - segment.fromY
    return offsetX * offsetX + offsetY * offsetY
  }
  if (projection >= lengthSquared) {
    const offsetX = point.x - segment.toX
    const offsetY = point.y - segment.toY
    return offsetX * offsetX + offsetY * offsetY
  }
  const cross = (point.x - segment.fromX) * dy - (point.y - segment.fromY) * dx
  return (cross * cross) / lengthSquared
}

export function segmentHitsUnit(
  index: WorldSpatialIndex['units'],
  positions: ReadonlyMap<EntityId, PositionData>,
  options: UnitCollisionOptions
): boolean {
  const { movingId, segment, allowedDestination, ignoredUnitIds } = options
  const collisionRadius = UNIT_COLLISION_RADIUS_FIXED * 2
  const candidateIds = index.query(segmentBounds(segment, collisionRadius))
  return candidateIds.some((id) => {
    if (id === movingId || ignoredUnitIds?.has(id) === true) {
      return false
    }
    const position = positions.get(id)
    if (
      allowedDestination !== undefined &&
      position?.x === allowedDestination.x &&
      position.y === allowedDestination.y
    ) {
      return false
    }
    if (position?.x === segment.fromX && position.y === segment.fromY && id > movingId) {
      return false
    }
    if (position !== undefined) {
      const directionX = segment.toX - segment.fromX
      const directionY = segment.toY - segment.fromY
      const progress = (position.x - segment.fromX) * directionX + (position.y - segment.fromY) * directionY
      if (progress <= 0) {
        return false
      }
      const collisionDistance = UNIT_COLLISION_RADIUS_FIXED * 2
      const initialX = position.x - segment.fromX
      const initialY = position.y - segment.fromY
      const finalX = position.x - segment.toX
      const finalY = position.y - segment.toY
      const startsOverlapping = initialX * initialX + initialY * initialY < collisionDistance * collisionDistance
      const exitsOverlap = finalX * finalX + finalY * finalY > initialX * initialX + initialY * initialY
      if (startsOverlapping && exitsOverlap) {
        return false
      }
    }
    return (
      position !== undefined && pointDistanceSquaredToSegment(position, segment) < collisionRadius * collisionRadius
    )
  })
}

export function segmentIsClear(
  index: WorldSpatialIndex,
  positions: ReadonlyMap<EntityId, PositionData>,
  options: UnitCollisionOptions
): boolean {
  const { segment } = options
  return !segmentHitsBuilding(index.buildings, segment) && !segmentHitsUnit(index.units, positions, options)
}
