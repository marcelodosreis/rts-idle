import type { BuildingType } from '@rts/shared'

const OWNER_COLORS = [0x2e7d32, 0xc62828, 0x1565c0, 0xf9a825]

export interface BuildingVisualStyle {
  readonly kind: 'base' | 'completed' | 'foundation'
  readonly fillColor: number
  readonly fillAlpha: number
  readonly strokeColor: number
}

export function ownerColor(owner: number): number {
  return OWNER_COLORS[owner % OWNER_COLORS.length] ?? 0x64748b
}

/** Presentation contract for completed buildings and construction phases. */
export function buildingVisualStyle(
  buildingType: BuildingType,
  status: 'FOUNDATION' | 'UNDER_CONSTRUCTION' | 'COMPLETED',
  owner: number
): BuildingVisualStyle {
  if (status === 'COMPLETED' && buildingType === 'BASE') {
    return { kind: 'base', fillColor: ownerColor(owner), fillAlpha: 0.8, strokeColor: 0xf8fafc }
  }
  if (status === 'COMPLETED') {
    return {
      kind: 'completed',
      fillColor: ownerColor(owner),
      fillAlpha: 0.82,
      strokeColor: 0xf8fafc
    }
  }
  return { kind: 'foundation', fillColor: ownerColor(owner), fillAlpha: 0.3, strokeColor: 0xfacc15 }
}
