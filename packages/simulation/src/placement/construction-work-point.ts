import { distSquaredFixed, type Fixed, tilesToFixed } from '@rts/shared'
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

function clampToMap(value: number, mapLength: number): number {
  return Math.max(0, Math.min(value, mapLength - 1))
}

function candidateForSide(rule: SideRule, footprint: BuildingFootprint, bounds: PlacementMapBounds): FixedPosition {
  const tangentialAxis: Axis = rule.normalAxis === 'x' ? 'y' : 'x'
  const normalOrigin = footprint[rule.normalAxis]
  const normalSize = rule.normalAxis === 'x' ? footprint.width : footprint.height
  const tangentialOrigin = footprint[tangentialAxis]
  const tangentialSize = tangentialAxis === 'x' ? footprint.width : footprint.height
  const normalLimit = rule.normalAxis === 'x' ? bounds.width : bounds.height
  const tangentialLimit = tangentialAxis === 'x' ? bounds.width : bounds.height
  const normal = rule.edge === 'MIN' ? normalOrigin : normalOrigin + normalSize
  const tangential = tangentialOrigin + Math.floor(tangentialSize / 2)

  const normalFixed = tilesToFixed(clampToMap(normal, normalLimit))
  const tangentialFixed = tilesToFixed(clampToMap(tangential, tangentialLimit))
  return rule.normalAxis === 'x' ? { x: normalFixed, y: tangentialFixed } : { x: tangentialFixed, y: normalFixed }
}

/** Chooses a deterministic construction point on the nearest footprint side. */
export function constructionWorkPoint(
  workerPosition: FixedPosition,
  footprint: BuildingFootprint,
  bounds: PlacementMapBounds
): FixedPosition {
  let nearest = candidateForSide(SIDE_RULES[0]!, footprint, bounds)
  let nearestDistance = distSquaredFixed(workerPosition.x, workerPosition.y, nearest.x, nearest.y)
  for (const rule of SIDE_RULES.slice(1)) {
    const candidate = candidateForSide(rule, footprint, bounds)
    const candidateDistance = distSquaredFixed(workerPosition.x, workerPosition.y, candidate.x, candidate.y)
    if (candidateDistance < nearestDistance) {
      nearest = candidate
      nearestDistance = candidateDistance
    }
  }
  return nearest
}
