import {
  createRulesIdentity,
  createSimulation,
  MAX_ACTIVE_NAVIGATION_SEARCHES,
  NAVIGATION_EXPANSION_BUDGET,
  simulationFromSnapshot
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'

const IDENTITY = createRulesIdentity('path-budget', {
  mapId: 'path-budget-map',
  mapHash: 'path-budget-map-hash'
})
const MAP_SIZE = 64
const WALL_X = 32

function wallTiles(): readonly { readonly x: number; readonly y: number }[] {
  return Array.from({ length: MAP_SIZE }, (_, y) => ({ x: WALL_X, y }))
}

function initialRequests() {
  return Array.from({ length: MAX_ACTIVE_NAVIGATION_SEARCHES }, (_, index) => ({
    start: { x: 0, y: index },
    destination: { x: MAP_SIZE - 1, y: index }
  }))
}

function createBudgetSimulation() {
  return createSimulation({
    seed: 123,
    identity: IDENTITY,
    mapBounds: { width: MAP_SIZE, height: MAP_SIZE, invalidTiles: wallTiles() },
    navigation: { initialRequests: initialRequests() }
  })
}

describe('serializable navigation budget', () => {
  it('uses the global budget and stable round-robin slices', () => {
    const simulation = createBudgetSimulation()

    simulation.step()

    const requests = simulation.inspectState().navigation.requests
    expect(requests).toHaveLength(MAX_ACTIVE_NAVIGATION_SEARCHES)
    expect(requests.every((request) => request.state.status === 'PENDING')).toBe(true)
    expect(requests.reduce((total, request) => total + request.state.expanded, 0)).toBe(NAVIGATION_EXPANSION_BUDGET)
    expect(requests.map((request) => request.state.requestId)).toEqual([0, 1, 2, 3])
    expect(requests.map((request) => request.state.expanded)).toEqual([1024, 1024, 1024, 1024])
  })

  it('preserves the availability tick across snapshot restore', () => {
    const original = createBudgetSimulation()
    original.step()
    const restored = simulationFromSnapshot(original.exportSnapshot())

    expect(restored.hashState()).toBe(original.hashState())
    original.step()
    restored.step()

    expect(restored.hashState()).toBe(original.hashState())
    original.step()
    restored.step()

    expect(restored.hashState()).toBe(original.hashState())
    expect(restored.inspectState().navigation.requests).toEqual(original.inspectState().navigation.requests)
    expect(restored.inspectState().navigation.requests.every((request) => request.availableTick === 3)).toBe(true)
    expect(restored.inspectState().navigation.requests.every((request) => request.state.status === 'UNREACHABLE')).toBe(
      true
    )
  })

  it('records found and invalidated-at-admission results deterministically', () => {
    const simulation = createSimulation({
      seed: 123,
      identity: IDENTITY,
      mapBounds: { width: 8, height: 8, invalidTiles: [{ x: 0, y: 0 }] },
      navigation: {
        initialRequests: [
          { start: { x: 1, y: 1 }, destination: { x: 2, y: 2 } },
          { start: { x: 0, y: 0 }, destination: { x: 2, y: 2 } }
        ]
      }
    })

    const before = simulation.inspectState().navigation.requests
    expect(before[1]?.state.status).toBe('INVALIDATED')
    expect(before[1]?.availableTick).toBe(0)

    simulation.step()

    const after = simulation.inspectState().navigation.requests
    expect(after[0]?.state.status).toBe('FOUND')
    expect(after[0]?.availableTick).toBe(1)
    expect(after[1]?.state.status).toBe('INVALIDATED')
  })

  it('rejects more than the supported number of initial active searches', () => {
    expect(() =>
      createSimulation({
        seed: 123,
        identity: IDENTITY,
        navigation: {
          initialRequests: Array.from({ length: MAX_ACTIVE_NAVIGATION_SEARCHES + 1 }, () => ({
            start: { x: 0, y: 0 },
            destination: { x: 1, y: 1 }
          }))
        }
      })
    ).toThrow(/at most 4 initial searches/)
  })
})
