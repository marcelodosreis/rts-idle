import type { SelectionPoint } from './select-units-in-box.js'
import { selectUnitsInBox } from './select-units-in-box.js'

export interface BoxPoint {
  readonly x: number
  readonly y: number
}

export interface BoxBuilding {
  readonly id: number
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface BoxResource {
  readonly id: number
  readonly x: number
  readonly y: number
}

export type BoxSelection =
  | { readonly kind: 'units'; readonly ids: readonly number[] }
  | { readonly kind: 'building'; readonly id: number }
  | { readonly kind: 'resource'; readonly id: number }
  | { readonly kind: 'none' }

interface BoxRect {
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
}

function boxRect(from: BoxPoint, to: BoxPoint): BoxRect {
  return {
    left: Math.min(from.x, to.x),
    right: Math.max(from.x, to.x),
    top: Math.min(from.y, to.y),
    bottom: Math.max(from.y, to.y)
  }
}

function intersectsRect(rect: BoxRect, building: BoxBuilding): boolean {
  return (
    building.x <= rect.right &&
    building.x + building.width >= rect.left &&
    building.y <= rect.bottom &&
    building.y + building.height >= rect.top
  )
}

function containsPoint(rect: BoxRect, point: BoxPoint): boolean {
  return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom
}

function lowestId<T extends { readonly id: number }>(
  candidates: readonly T[],
  matches: (candidate: T) => boolean
): number | null {
  let selected: number | null = null
  for (const candidate of candidates) {
    if (!matches(candidate)) {
      continue
    }
    if (selected === null || candidate.id < selected) {
      selected = candidate.id
    }
  }
  return selected
}

/**
 * Box selection precedence: units first, then the lowest-id building whose
 * footprint intersects the box, then the lowest-id resource whose point is
 * inside it. Buildings win over resources, and only one of them is ever
 * reported; unit selection stays multi-unit.
 */
export function selectInBox(input: {
  readonly units: ReadonlyMap<number, SelectionPoint>
  readonly buildings: readonly BoxBuilding[]
  readonly resources: readonly BoxResource[]
  readonly from: BoxPoint
  readonly to: BoxPoint
}): BoxSelection {
  const units = selectUnitsInBox(input.units, input.from, input.to)
  if (units.length > 0) {
    return { kind: 'units', ids: units }
  }
  const rect = boxRect(input.from, input.to)
  const buildingId = lowestId(input.buildings, (building) => intersectsRect(rect, building))
  if (buildingId !== null) {
    return { kind: 'building', id: buildingId }
  }
  const resourceId = lowestId(input.resources, (resource) => containsPoint(rect, resource))
  if (resourceId !== null) {
    return { kind: 'resource', id: resourceId }
  }
  return { kind: 'none' }
}
