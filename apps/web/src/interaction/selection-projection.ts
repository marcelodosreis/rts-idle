import type { HudSelectionUnit } from '../hud/types'

export type SelectionUnitState = Omit<HudSelectionUnit, 'id' | 'moving'>
export type RenderedPosition = { readonly x: number; readonly y: number }

export function projectSelectionUnits(
  unitStates: ReadonlyMap<number, SelectionUnitState>,
  unitPositions: ReadonlyMap<number, RenderedPosition>,
  previousPositions: ReadonlyMap<number, RenderedPosition>,
  selectedIds: readonly number[]
): readonly HudSelectionUnit[] {
  const units: HudSelectionUnit[] = []
  for (const id of [...new Set(selectedIds)].sort((a, b) => a - b)) {
    const state = unitStates.get(id)
    const current = unitPositions.get(id)
    const previous = previousPositions.get(id)
    if (state !== undefined && current !== undefined) {
      units.push({
        id,
        ...state,
        moving: previous !== undefined && (previous.x !== current.x || previous.y !== current.y)
      })
    }
  }
  return units
}
