import type { BuildingStatus, BuildingType } from '@rts/shared'
import { progressFillColor } from '../effects/progress-palette.js'
import { ownerColor } from './owner-color.js'

export const BUILDING_VISUAL_KINDS = ['castle', 'completed', 'foundation'] as const
export type BuildingVisualKind = (typeof BUILDING_VISUAL_KINDS)[number]

export interface BuildingVisualStyle {
  readonly kind: BuildingVisualKind
  readonly fillColor: number
  readonly fillAlpha: number
  readonly strokeColor: number
}

/** Presentation contract for completed buildings and construction phases. */
export function buildingVisualStyle(
  buildingType: BuildingType,
  status: BuildingStatus,
  owner: number
): BuildingVisualStyle {
  if (status === 'COMPLETED' && buildingType === 'CASTLE') {
    return {
      kind: 'castle',
      fillColor: ownerColor(owner),
      fillAlpha: 0.8,
      strokeColor: progressFillColor('construction')
    }
  }
  if (status === 'COMPLETED') {
    return {
      kind: 'completed',
      fillColor: ownerColor(owner),
      fillAlpha: 0.82,
      strokeColor: progressFillColor('construction')
    }
  }
  return {
    kind: 'foundation',
    fillColor: ownerColor(owner),
    fillAlpha: 0.3,
    strokeColor: progressFillColor('construction')
  }
}
