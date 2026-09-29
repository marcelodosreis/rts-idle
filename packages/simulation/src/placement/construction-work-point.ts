import { type BuildingVisualSize, distSquaredFixed, type Fixed, tilesToFixed } from '@rts/shared'
import type { BuildingFootprint, PlacementMapBounds } from './building-placement.js'

export interface FixedPosition {
  readonly x: Fixed
  readonly y: Fixed
}

type Axis = 'x' | 'y'
type Edge = 'MIN' | 'MAX'

interface SideRule {
  readonly normalAxis: Axis
  readonly edge: Edge
}

// Declaration order is the deterministic tie-break: TOP, RIGHT, BOTTOM, LEFT.
const SIDE_RULES: readonly SideRule[] = [
  { normalAxis: 'y', edge: 'MIN' },
  { normalAxis: 'x', edge: 'MAX' },
  { normalAxis: 'y', edge: 'MAX' },
  { normalAxis: 'x', edge: 'MIN' }
]

function clampToMapFixed(value: number, mapLength: number): number {
  return Math.max(0, Math.min(value, tilesToFixed(mapLength - 1)))
}

function axisSize(axis: Axis, footprint: BuildingFootprint, visualSize: BuildingVisualSize | null): number {
  if (visualSize !== null) {
    return axis === 'x' ? visualSize.width : visualSize.height
  }
  return tilesToFixed(axis === 'x' ? footprint.width : footprint.height)
}

function candidateForSide(
  rule: SideRule,
  footprint: BuildingFootprint,
  bounds: PlacementMapBounds,
  visualSize: BuildingVisualSize | null
): FixedPosition {
  const tangentialAxis: Axis = rule.normalAxis === 'x' ? 'y' : 'x'
  const normalOrigin = tilesToFixed(footprint[rule.normalAxis])
  const normalSize = axisSize(rule.normalAxis, footprint, visualSize)
  const tangentialOrigin = tilesToFixed(footprint[tangentialAxis])
  const tangentialSize = axisSize(tangentialAxis, footprint, visualSize)
  const normalLimit = rule.normalAxis === 'x' ? bounds.width : bounds.height
  const tangentialLimit = tangentialAxis === 'x' ? bounds.width : bounds.height
  const normal = rule.edge === 'MIN' ? normalOrigin : normalOrigin + normalSize
  const tangential = tangentialOrigin + Math.floor(tangentialSize / 2)

  const normalFixed = clampToMapFixed(normal, normalLimit)
  const tangentialFixed = clampToMapFixed(tangential, tangentialLimit)
  return rule.normalAxis === 'x' ? { x: normalFixed, y: tangentialFixed } : { x: tangentialFixed, y: normalFixed }
}

/** Chooses a deterministic construction point on the nearest footprint side. */
export function constructionWorkPoint(
  workerPosition: FixedPosition,
  footprint: BuildingFootprint,
  bounds: PlacementMapBounds,
  visualSize: BuildingVisualSize | null = null
): FixedPosition {
  let nearest = candidateForSide(SIDE_RULES[0]!, footprint, bounds, visualSize)
  let nearestDistance = distSquaredFixed(workerPosition.x, workerPosition.y, nearest.x, nearest.y)
  for (const rule of SIDE_RULES.slice(1)) {
    const candidate = candidateForSide(rule, footprint, bounds, visualSize)
    const candidateDistance = distSquaredFixed(workerPosition.x, workerPosition.y, candidate.x, candidate.y)
    if (candidateDistance < nearestDistance) {
      nearest = candidate
      nearestDistance = candidateDistance
    }
  }
  return nearest
}
