import type { MatchConfig, SnapshotMessage } from '@rts/protocol'
import { describe, expect, it, vi } from 'vitest'
import { createMatchSessionHandlers } from '../../../apps/web/src/features/match/lifecycle/match-session-handlers'
import { createMatchSessionRuntime } from '../../../apps/web/src/features/match/lifecycle/match-session-runtime'

function snapshot(overrides: Partial<SnapshotMessage> = {}): SnapshotMessage {
  return {
    type: 'snapshot',
    tick: 4,
    phase: 'RUNNING',
    units: [{ id: 1, x: 10, y: 20, owner: 0, kind: 'pawn', orderState: 'moving' }],
    buildings: [],
    mineralNodes: [{ id: 7, x: 0, y: 0, remaining: 30 }],
    players: [{ id: 0, defeated: false, gold: 12, usedSupply: 1, supplyCap: 5 }],
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
    setSelectedMineral: vi.fn(),
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
    expect(callbacks.setResources).toHaveBeenCalledWith({ mineral: 12, supply: 1, supplyCap: 5 })
    expect(callbacks.appendLog).toHaveBeenCalledWith('event', 'damageDealt: 1 -3 HP (7 left)')
    expect(callbacks.present).toHaveBeenCalledOnce()
  })

  it('removes missing units and refreshes a selected mineral', () => {
    const { runtime, callbacks, handlers } = harness()
    handlers.onSnapshot(snapshot())
    runtime.selectedMineralId = 7
    handlers.onSnapshot(snapshot({ tick: 5, units: [] }))
    expect(runtime.unitStates.size).toBe(0)
    expect(runtime.unitPositions.size).toBe(0)
    expect(callbacks.setSelectedMineral).toHaveBeenLastCalledWith({ id: 7, remaining: 30 })
    handlers.onSnapshot(snapshot({ tick: 6, mineralNodes: [] }))
    expect(runtime.selectedMineralId).toBeNull()
    expect(callbacks.setSelectedMineral).toHaveBeenLastCalledWith(null)
  })

  it('guards open, error, and stale callbacks', () => {
    const { runtime, callbacks, handlers } = harness()
    handlers.onOpen?.()
    handlers.onError?.({ type: 'error', message: 'bad', scenarios: [] })
    expect(callbacks.setStatus).toHaveBeenNthCalledWith(1, 'connected')
    expect(callbacks.setStatus).toHaveBeenNthCalledWith(2, 'error')
    runtime.sessionActive = false
    handlers.onOpen?.()
    handlers.onError?.({ type: 'error', message: 'stale' })
    expect(callbacks.setStatus).toHaveBeenCalledTimes(2)
  })

  it.each([
    [
      'victory',
      [
        { id: 0, defeated: false, gold: 0, usedSupply: 0, supplyCap: 1 },
        { id: 1, defeated: true, gold: 0, usedSupply: 0, supplyCap: 0 }
      ]
    ],
    [
      'defeat',
      [
        { id: 0, defeated: true, gold: 0, usedSupply: 0, supplyCap: 1 },
        { id: 1, defeated: false, gold: 0, usedSupply: 0, supplyCap: 1 }
      ]
    ],
    [
      'draw',
      [
        { id: 0, defeated: false, gold: 0, usedSupply: 0, supplyCap: 1 },
        { id: 1, defeated: false, gold: 0, usedSupply: 0, supplyCap: 1 }
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
      map: { width: 1, height: 1, tiles: ['land'] },
      buildings: [],
      scenarios: [],
      scenario: { id: 'x', label: 'X' }
    }
    handlers.onMatchConfig?.(config)
    expect(callbacks.onMatchConfig).toHaveBeenCalledWith(config)
  })
})
