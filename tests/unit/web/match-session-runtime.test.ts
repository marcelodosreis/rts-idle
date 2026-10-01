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
      buildingType: 'CASTLE',
      x: 0,
      y: 0,
      owner: 0,
      footprint: { width: 2, height: 2 },
      status: 'FOUNDATION',
      progressTicks: 1,
      totalTicks: 10
    }
  ]
  runtime.resources = [{ resourceId: 8, remaining: 42 }]
  runtime.resourceAmounts.set(8, 42)
  runtime.map = {
    width: 1,
    height: 1,
    tiles: ['land'],
    resources: [
      {
        resourceId: 8,
        kind: 'TREE',
        x: 0,
        y: 0,
        variant: 0,
        initialAmount: 30,
        harvestAmount: 10,
        harvestTicks: 200,
        blocksNavigation: false
      }
    ]
  }
  return runtime
}

describe('match session runtime selection', () => {
  it('deduplicates ids and orders projected units while preserving moving state', () => {
    const runtime = runtimeWithState()
    const setSelection = vi.fn()
    const setSelectedRallyProducer = vi.fn()
    const setSelectedRallyPoint = vi.fn()
    runtime.renderer = { setSelection, setSelectedRallyProducer, setSelectedRallyPoint } as never

    const selection = runtime.selectUnits([3, 1, 3])

    expect(selection.ids).toEqual([3, 1])
    expect(selection.units.map((unit) => unit.id)).toEqual([1, 3])
    expect(selection.units[0]?.moving).toBe(false)
    expect(selection.units[1]?.moving).toBe(true)
    expect(setSelection).toHaveBeenCalledWith([3, 1])
    expect(setSelectedRallyProducer).toHaveBeenCalledWith(null)
  })

  it('keeps unit, building, and resource selection mutually exclusive', () => {
    const runtime = runtimeWithState()

    expect(runtime.selectUnits([])).toEqual({ ids: [], units: [], construction: null, resource: null })
    expect(runtime.selectConstruction(9).construction?.id).toBe(9)
    expect(runtime.selectedIds).toEqual([])
    expect(runtime.selectedResourceId).toBeNull()

    expect(runtime.selectResource(8).resource).toEqual({ id: 8, remaining: 42, kind: 'TREE' })
    expect(runtime.selectedConstructionId).toBeNull()
    expect(runtime.selectedIds).toEqual([])

    expect(runtime.selectUnits([1]).units).toHaveLength(1)
    expect(runtime.selectedConstructionId).toBeNull()
    expect(runtime.selectedResourceId).toBeNull()
    expect(runtime.selectConstruction(999)).toEqual({ ids: [], units: [], construction: null, resource: null })
  })

  it('resolves the resource kind at selection time instead of defaulting to Gold Mine', () => {
    const runtime = runtimeWithState()

    expect(runtime.selectResource(8).resource).toEqual({ id: 8, remaining: 42, kind: 'TREE' })
  })

  it('selects an enemy building without exposing it as an owned construction action', () => {
    const runtime = runtimeWithState()
    runtime.buildings = [
      {
        id: 17,
        buildingType: 'BARRACKS',
        x: 40,
        y: 40,
        owner: 1,
        footprint: { width: 2, height: 2 },
        status: 'COMPLETED',
        progressTicks: 100,
        totalTicks: 100,
        hp: 300,
        maxHp: 300
      }
    ]

    expect(runtime.selectConstruction(17).construction).toMatchObject({ id: 17, owner: 1, status: 'COMPLETED' })
    expect(runtime.selectedConstructionId).toBe(17)
  })

  it('clears missing entities and refreshes selection from current runtime maps', () => {
    const runtime = runtimeWithState()
    runtime.selectResource(8)
    runtime.resources = []
    runtime.resourceAmounts.clear()
    expect(runtime.selectResource(8)).toEqual({ ids: [], units: [], construction: null, resource: null })

    runtime.unitPositions.set(1, { x: 7, y: 5 })
    const refreshed = runtime.selectUnits([1])
    expect(refreshed.units[0]).toMatchObject({ id: 1, moving: true })
    runtime.unitStates.delete(1)
    expect(runtime.selectUnits([1]).units).toEqual([])
  })
})
