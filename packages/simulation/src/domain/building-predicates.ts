import type { EntityId } from '@rts/shared'
import type { BuildingData } from '../ecs/building-component.js'

export function isCompletedBase(building: BuildingData | undefined): building is BuildingData {
  return building !== undefined && building.buildingType === 'BASE' && building.status === 'COMPLETED'
}

export function isActiveConstruction(building: BuildingData | undefined): building is BuildingData {
  return building !== undefined && building.status !== 'COMPLETED'
}

/** Stable nearest-candidate comparison: distance first, entity id second. */
export function isCloserCandidate(
  distance: number,
  id: EntityId,
  bestDistance: number,
  bestId: EntityId | null
): boolean {
  return distance < bestDistance || (distance === bestDistance && (bestId === null || id < bestId))
}
