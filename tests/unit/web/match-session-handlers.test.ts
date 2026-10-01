import type { MatchConfig, SnapshotMessage } from '@rts/protocol'
import { describe, expect, it, vi } from 'vitest'
import { createMatchSessionHandlers } from '../../../apps/web/src/features/match/services/match-session-handlers'
import { createMatchSessionRuntime } from '../../../apps/web/src/features/match/services/match-session-runtime'

function snapshot(overrides: Partial<SnapshotMessage> = {}): SnapshotMessage {
  return {
    type: 'snapshot',
    tick: 4,
    phase: 'RUNNING',
    units: [{ id: 1, x: 10, y: 20, owner: 0, kind: 'pawn', orderState: 'moving' }],
    buildings: [],
    resources: [{ resourceId: 7, remaining: 30 }],
    resourcesComplete: true,
    players: [{ id: 0, defeated: false, resources: { GOLD: 12, WOOD: 0 }, usedSupply: 1, supplyCap: 5 }],
    events: [],
    ...overrides
  }
}

function harness() {
  const runtime = createMatchSessionRuntime()
  const callbacks = {
    clearCommandMode: vi.fn(),
    appendLog: vi.fn(),
    cancelPlacement: vi.fn(),
    updateConstructionSelection: vi.fn(),
    updateSelection: vi.fn(),
    setStatus: vi.fn(),
    setTick: vi.fn(),
    setUnitCount: vi.fn(),
    setResources: vi.fn(),
    appendCompletedConstructions: vi.fn(),
    setHudNotification: vi.fn(),
    setSelectedResource: vi.fn(),
    setMatchResult: vi.fn(),
    present: vi.fn(),
    onMatchConfig: vi.fn(),
    setScenarios: vi.fn()
  }
  return { runtime, callbacks, handlers: createMatchSessionHandlers({ runtime, ...callbacks }) }
}

describe('match session handlers', () => {
  it('refreshes snapshots, maps, resources, and event logs', () => {
    const { runtime, callbacks, handlers } = harness()
    handlers.onSnapshot(snapshot({ events: [{ type: 'damageDealt', targetId: 1, amount: 3, targetHp: 7 }] }))
    expect(runtime.unitStates.get(1)).toMatchObject({ kind: 'pawn', orderState: 'moving' })
    expect(runtime.unitPositions.get(1)).toEqual({ x: 10, y: 20 })
    expect(callbacks.setTick).toHaveBeenCalledWith(4)
    expect(callbacks.setResources).toHaveBeenCalledWith({
      resources: { GOLD: 12, WOOD: 0 },
      supply: 1,
      reservedSupply: 0,
      supplyCap: 5,
      castleTier: 1,
      completedResearch: [],
      queuedResearch: []
    })
    expect(callbacks.appendLog).toHaveBeenCalledWith('event', 'damageDealt: 1 -3 HP (7 left)')
    expect(callbacks.present).toHaveBeenCalledOnce()
  })

  it('reports only a human construction that transitions to completed', () => {
    const { callbacks, handlers } = harness()
    const foundation: SnapshotMessage['buildings'][number] = {
      id: 9,
      buildingType: 'HOUSE',
      x: 0,
      y: 0,
      owner: 0,
      footprint: { width: 2, height: 2 },
      status: 'FOUNDATION',
      progressTicks: 0,
      totalTicks: 100,
      builderId: 1
    }
    handlers.onSnapshot(snapshot({ buildings: [foundation] }))
    handlers.onSnapshot(snapshot({ tick: 5, buildings: [{ ...foundation, status: 'COMPLETED', builderId: null }] }))
    expect(callbacks.appendCompletedConstructions).toHaveBeenNthCalledWith(1, [])
    expect(callbacks.appendCompletedConstructions).toHaveBeenNthCalledWith(2, [expect.objectContaining({ id: 9 })])
  })

  it('projects Castle tier and research progress for the human player', () => {
    const { callbacks, handlers } = harness()
    handlers.onSnapshot(
      snapshot({
        buildings: [
          {
            id: 9,
            buildingType: 'CASTLE',
            x: 0,
            y: 0,
            owner: 0,
            footprint: { width: 2, height: 2 },
            status: 'COMPLETED',
            tier: 2,
            progressTicks: 100,
            totalTicks: 100,
            builderId: null
          }
        ],
        players: [
          {
            id: 0,
            defeated: false,
            resources: { GOLD: 40, WOOD: 0 },
            usedSupply: 2,
            supplyCap: 8,
            highestCastleTierReached: 2,
            completedResearch: ['ATTACK'],
            queuedResearch: ['MOVEMENT']
          }
        ]
      })
    )
    expect(callbacks.setResources).toHaveBeenCalledWith({
      resources: { GOLD: 40, WOOD: 0 },
      supply: 2,
      reservedSupply: 0,
      supplyCap: 8,
      castleTier: 2,
      completedResearch: ['ATTACK'],
      queuedResearch: ['MOVEMENT']
    })
  })

  it('relatches Tier II access when the last completed Castle II is gone', () => {
    const { callbacks, handlers } = harness()
    handlers.onSnapshot(
      snapshot({
        players: [
          {
            id: 0,
            defeated: false,
            resources: { GOLD: 40, WOOD: 0 },
            usedSupply: 2,
            supplyCap: 8,
            highestCastleTierReached: 2
          }
        ]
      })
    )
    expect(callbacks.setResources).toHaveBeenCalledWith({
      resources: { GOLD: 40, WOOD: 0 },
      supply: 2,
      reservedSupply: 0,
      supplyCap: 8,
      castleTier: 1,
      completedResearch: [],
      queuedResearch: []
    })
  })

  it('removes missing units and refreshes a selected resource', () => {
    const { runtime, callbacks, handlers } = harness()
    handlers.onSnapshot(snapshot())
    runtime.selectedResourceId = 7
    handlers.onSnapshot(snapshot({ tick: 5, units: [] }))
    expect(runtime.unitStates.size).toBe(0)
    expect(runtime.unitPositions.size).toBe(0)
    expect(callbacks.setSelectedResource).toHaveBeenLastCalledWith({ id: 7, remaining: 30 })
    handlers.onSnapshot(snapshot({ tick: 6, resources: [], resourcesComplete: true }))
    expect(runtime.selectedResourceId).toBeNull()
    expect(callbacks.setSelectedResource).toHaveBeenLastCalledWith(null)
  })

  it('keeps the resource kind when refreshing the selection from a snapshot', () => {
    const { runtime, callbacks, handlers } = harness()
    runtime.map = {
      width: 1,
      height: 1,
      tiles: ['land'],
      resources: [
        {
          resourceId: 7,
          kind: 'GOLD_MINE',
          x: 0,
          y: 0,
          variant: 0,
          initialAmount: 3_000,
          harvestAmount: 10,
          harvestTicks: 200,
          blocksNavigation: false
        }
      ]
    }
    runtime.selectedResourceId = 7
    handlers.onSnapshot(snapshot())

    expect(callbacks.setSelectedResource).toHaveBeenLastCalledWith({ id: 7, remaining: 30, kind: 'GOLD_MINE' })
  })

  it('merges resource deltas and rebuilds every amount on a complete snapshot', () => {
    const { runtime, handlers } = harness()
    handlers.onSnapshot(snapshot())
    expect(runtime.resourceAmounts.get(7)).toBe(30)

    handlers.onSnapshot(snapshot({ tick: 5, resources: [{ resourceId: 7, remaining: 20 }], resourcesComplete: false }))
    handlers.onSnapshot(snapshot({ tick: 6, resources: [{ resourceId: 8, remaining: 5 }], resourcesComplete: false }))
    expect(runtime.resourceAmounts.get(7)).toBe(20)
    expect(runtime.resourceAmounts.get(8)).toBe(5)

    handlers.onSnapshot(snapshot({ tick: 7, resources: [{ resourceId: 9, remaining: 1 }], resourcesComplete: true }))
    expect(runtime.resourceAmounts.has(7)).toBe(false)
    expect(runtime.resourceAmounts.has(8)).toBe(false)
    expect(runtime.resourceAmounts.get(9)).toBe(1)
  })

  it('logs command errors without changing the connected status', () => {
    const { runtime, callbacks, handlers } = harness()
    handlers.onOpen?.()
    handlers.onError?.({ type: 'error', message: 'bad', scenarios: [] })
    expect(callbacks.setStatus).toHaveBeenNthCalledWith(1, 'connected')
    expect(callbacks.setStatus).toHaveBeenCalledTimes(1)
    expect(callbacks.appendLog).toHaveBeenCalledWith('error', 'bad')
    expect(callbacks.setHudNotification).toHaveBeenCalledWith({ kind: 'MATCH_ERROR', message: 'bad' })
    runtime.sessionActive = false
    handlers.onOpen?.()
    handlers.onError?.({ type: 'error', message: 'stale' })
    expect(callbacks.setStatus).toHaveBeenCalledTimes(1)
  })

  it('changes status only for transport failures and closes', () => {
    const { runtime, callbacks, handlers } = harness()
    handlers.onOpen?.()
    handlers.onTransportError?.({ type: 'error', message: 'network failed' })
    expect(callbacks.setStatus).toHaveBeenNthCalledWith(1, 'connected')
    expect(callbacks.setStatus).toHaveBeenNthCalledWith(2, 'error')
    expect(callbacks.appendLog).toHaveBeenCalledWith('error', 'network failed')
    expect(callbacks.setHudNotification).toHaveBeenCalledWith({ kind: 'CONNECTION_LOST' })
    handlers.onClose?.()
    expect(callbacks.setStatus).toHaveBeenNthCalledWith(3, 'error')
    expect(callbacks.appendLog).toHaveBeenCalledWith('error', 'Connection closed')
    expect(callbacks.setHudNotification).toHaveBeenCalledWith({ kind: 'CONNECTION_CLOSED' })
    runtime.sessionActive = false
    handlers.onTransportError?.({ type: 'error', message: 'stale' })
    handlers.onClose?.()
    expect(callbacks.setStatus).toHaveBeenCalledTimes(3)
  })

  it.each([
    [
      'victory',
      [
        { id: 0, defeated: false, resources: { GOLD: 0, WOOD: 0 }, usedSupply: 0, supplyCap: 1 },
        { id: 1, defeated: true, resources: { GOLD: 0, WOOD: 0 }, usedSupply: 0, supplyCap: 0 }
      ]
    ],
    [
      'defeat',
      [
        { id: 0, defeated: true, resources: { GOLD: 0, WOOD: 0 }, usedSupply: 0, supplyCap: 1 },
        { id: 1, defeated: false, resources: { GOLD: 0, WOOD: 0 }, usedSupply: 0, supplyCap: 1 }
      ]
    ],
    [
      'draw',
      [
        { id: 0, defeated: false, resources: { GOLD: 0, WOOD: 0 }, usedSupply: 0, supplyCap: 1 },
        { id: 1, defeated: false, resources: { GOLD: 0, WOOD: 0 }, usedSupply: 0, supplyCap: 1 }
      ]
    ]
  ] as const)('reports finished %s once and cancels command mode', (result, players) => {
    const { callbacks, handlers } = harness()
    handlers.onSnapshot(snapshot({ phase: 'FINISHED', players }))
    handlers.onSnapshot(snapshot({ phase: 'FINISHED', tick: 5, players }))
    expect(callbacks.setMatchResult).toHaveBeenCalledOnce()
    expect(callbacks.setMatchResult).toHaveBeenCalledWith(result)
    expect(callbacks.clearCommandMode).toHaveBeenCalledOnce()
    expect(callbacks.cancelPlacement).toHaveBeenCalledOnce()
  })

  it('forwards match config', () => {
    const { callbacks, handlers } = harness()
    const config: MatchConfig = {
      type: 'match_config',
      map: { width: 1, height: 1, tiles: ['land'], resources: [] },
      buildings: [],
      production: [],
      research: [],
      scenarios: [],
      scenario: { id: 'x', label: 'X' }
    }
    handlers.onMatchConfig?.(config)
    expect(callbacks.onMatchConfig).toHaveBeenCalledWith(config)
  })
})
