import { describe, expect, it, vi } from 'vitest'
import { createMatchSessionRuntime } from '../../../apps/web/src/features/match/lifecycle/match-session-runtime'

function runtimeWithState() {
  const runtime = createMatchSessionRuntime()
  runtime.unitStates.set(3, { kind: 'pawn', owner: 0, orderState: 'moving' })
  runtime.unitStates.set(1, { kind: 'warrior', owner: 0 })
  runtime.unitPositions.set(3, { x: 20, y: 10 })
  runtime.unitPositions.set(1, { x: 5, y: 5 })
  runtime.prevFramePositions.set(3, { x: 10, y: 10 })
  runtime.prevFramePositions.set(1, { x: 5, y: 5 })
  runtime.buildings = [
    {
      id: 9,
      buildingType: 'BASE',
      x: 0,
      y: 0,
      owner: 0,
      footprint: { width: 2, height: 2 },
      status: 'FOUNDATION',
      progressTicks: 1,
      totalTicks: 10
    }
  ]
  runtime.mineralNodes = [{ id: 8, x: 0, y: 0, remaining: 42 }]
  return runtime
}

describe('match session runtime selection', () => {
  it('deduplicates ids and orders projected units while preserving moving state', () => {
    const runtime = runtimeWithState()
    const setSelection = vi.fn()
    runtime.renderer = { setSelection } as never

    const selection = runtime.selectUnits([3, 1, 3])

    expect(selection.ids).toEqual([3, 1])
    expect(selection.units.map((unit) => unit.id)).toEqual([1, 3])
    expect(selection.units[0]?.moving).toBe(false)
    expect(selection.units[1]?.moving).toBe(true)
    expect(setSelection).toHaveBeenCalledWith([3, 1])
  })

  it('keeps unit, building, and mineral selection mutually exclusive', () => {
    const runtime = runtimeWithState()

    expect(runtime.selectUnits([])).toEqual({ ids: [], units: [], construction: null, mineral: null })
    expect(runtime.selectConstruction(9).construction?.id).toBe(9)
    expect(runtime.selectedIds).toEqual([])
    expect(runtime.selectedMineralId).toBeNull()

    expect(runtime.selectMineral(8).mineral).toEqual({ id: 8, remaining: 42 })
    expect(runtime.selectedConstructionId).toBeNull()
    expect(runtime.selectedIds).toEqual([])

    expect(runtime.selectUnits([1]).units).toHaveLength(1)
    expect(runtime.selectedConstructionId).toBeNull()
    expect(runtime.selectedMineralId).toBeNull()
    expect(runtime.selectConstruction(999)).toEqual({ ids: [], units: [], construction: null, mineral: null })
  })

  it('clears missing entities and refreshes selection from current runtime maps', () => {
    const runtime = runtimeWithState()
    runtime.selectMineral(8)
    runtime.mineralNodes = []
    expect(runtime.selectMineral(8)).toEqual({ ids: [], units: [], construction: null, mineral: null })

    runtime.unitPositions.set(1, { x: 7, y: 5 })
    const refreshed = runtime.selectUnits([1])
    expect(refreshed.units[0]).toMatchObject({ id: 1, moving: true })
    runtime.unitStates.delete(1)
    expect(runtime.selectUnits([1]).units).toEqual([])
  })
})
