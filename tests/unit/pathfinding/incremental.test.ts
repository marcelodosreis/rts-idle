import {
  advanceIncrementalSearch,
  createIncrementalSearch,
  createNavigationGrid,
  invalidateIncrementalSearch
} from '@rts/pathfinding'
import { describe, expect, it } from 'vitest'

describe('incremental A* search', () => {
  it('consumes a bounded number of expansions and remains pending', () => {
    const grid = createNavigationGrid({ width: 20, height: 20 })
    const initial = createIncrementalSearch(grid, 7, { x: 0, y: 0 }, { x: 19, y: 19 })

    const next = advanceIncrementalSearch(grid, initial, 1)

    expect(initial.status).toBe('PENDING')
    expect(next.status).toBe('PENDING')
    expect(next.expanded).toBe(1)
    expect(advanceIncrementalSearch(grid, next, 0)).toEqual(next)
  })

  it('restores a pending state and produces the same result', () => {
    const grid = createNavigationGrid({ width: 12, height: 12, blockedTiles: [{ x: 5, y: 5 }] })
    const initial = createIncrementalSearch(grid, 11, { x: 0, y: 0 }, { x: 11, y: 11 })
    const paused = advanceIncrementalSearch(grid, initial, 3)
    const restored = structuredClone(paused)
    let originalState = paused
    let restoredState = restored

    while (originalState.status === 'PENDING') {
      originalState = advanceIncrementalSearch(grid, originalState, 4)
      restoredState = advanceIncrementalSearch(grid, restoredState, 4)
    }

    expect(restoredState).toEqual(originalState)
    expect(originalState.status).toBe('FOUND')
  })

  it('reports unreachable searches after exhausting the open set', () => {
    const grid = createNavigationGrid({
      width: 3,
      height: 3,
      blockedTiles: [
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 1, y: 2 }
      ]
    })
    const initial = createIncrementalSearch(grid, 12, { x: 0, y: 1 }, { x: 2, y: 1 })

    const result = advanceIncrementalSearch(grid, initial, 256)

    expect(result).toMatchObject({ status: 'UNREACHABLE', requestId: 12 })
  })

  it('invalidates a pending search without exposing a stale route', () => {
    const grid = createNavigationGrid({ width: 10, height: 10 })
    const initial = createIncrementalSearch(grid, 13, { x: 0, y: 0 }, { x: 9, y: 9 })

    const invalidated = invalidateIncrementalSearch(initial, 'NAVIGATION_CHANGED')

    expect(invalidated).toMatchObject({ status: 'INVALIDATED', reason: 'NAVIGATION_CHANGED' })
    expect(advanceIncrementalSearch(grid, invalidated, 256)).toEqual(invalidated)
  })
})
