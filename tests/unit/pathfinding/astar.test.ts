import { createNavigationGrid, findPath } from '@rts/pathfinding'
import { describe, expect, it } from 'vitest'

describe('deterministic A* pathfinding', () => {
  it('returns an optimal diagonal path with integer costs', () => {
    const grid = createNavigationGrid({ width: 5, height: 5 })

    const result = findPath(grid, { x: 0, y: 0 }, { x: 4, y: 4 })

    expect(result).toMatchObject({ status: 'FOUND', cost: 4 * 1448 })
    expect(result.status === 'FOUND' ? result.path : []).toEqual([0, 6, 12, 18, 24])
  })

  it('routes around a wall without cutting a diagonal corner', () => {
    const grid = createNavigationGrid({
      width: 5,
      height: 5,
      blockedTiles: [
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 1, y: 2 },
        { x: 1, y: 3 }
      ]
    })

    const result = findPath(grid, { x: 0, y: 0 }, { x: 4, y: 0 })

    expect(result.status).toBe('FOUND')
    expect(result.status === 'FOUND' ? result.path : []).toEqual([0, 5, 10, 15, 20, 21, 22, 18, 14, 9, 4])
  })

  it('resolves a blocked destination by distance and tile-index tie-break', () => {
    const grid = createNavigationGrid({ width: 3, height: 3, blockedTiles: [{ x: 1, y: 1 }] })

    const result = findPath(grid, { x: 0, y: 0 }, { x: 1, y: 1 })

    expect(result.status).toBe('FOUND')
    expect(result.status === 'FOUND' ? result.destination : null).toEqual({ x: 1, y: 0 })
  })

  it('reports unreachable destinations without throwing', () => {
    const grid = createNavigationGrid({
      width: 3,
      height: 3,
      blockedTiles: [
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 1, y: 2 }
      ]
    })

    const result = findPath(grid, { x: 0, y: 1 }, { x: 2, y: 1 })

    expect(result.status).toBe('UNREACHABLE')
    expect(result.expanded).toBeGreaterThan(0)
  })

  it('rejects an invalid or blocked start explicitly', () => {
    const grid = createNavigationGrid({ width: 2, height: 2, blockedTiles: [{ x: 0, y: 0 }] })

    expect(findPath(grid, { x: -1, y: 0 }, { x: 1, y: 1 })).toMatchObject({
      status: 'INVALID',
      reason: 'START_OUT_OF_BOUNDS'
    })
    expect(findPath(grid, { x: 0, y: 0 }, { x: 1, y: 1 })).toMatchObject({
      status: 'INVALID',
      reason: 'START_BLOCKED'
    })
  })

  it('returns the same route for repeated identical requests', () => {
    const grid = createNavigationGrid({
      width: 6,
      height: 6,
      blockedTiles: [
        { x: 2, y: 1 },
        { x: 2, y: 2 },
        { x: 2, y: 3 },
        { x: 3, y: 3 }
      ]
    })

    const first = findPath(grid, { x: 0, y: 0 }, { x: 5, y: 5 })
    const second = findPath(grid, { x: 0, y: 0 }, { x: 5, y: 5 })

    expect(second).toEqual(first)
  })
})
