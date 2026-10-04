import { createNavigationGrid } from '@rts/pathfinding'
import { resolveGroupDestinations } from '@rts/simulation'
import { describe, expect, it } from 'vitest'

describe('navigable group destinations', () => {
  it('sorts unit IDs before assigning the spiral', () => {
    const grid = createNavigationGrid({ width: 8, height: 8 })

    const destinations = resolveGroupDestinations(grid, [9, 2, 5], { x: 3, y: 3 })

    expect(destinations).toEqual([
      { unitId: 2, tile: { x: 3, y: 3 } },
      { unitId: 5, tile: { x: 4, y: 3 } },
      { unitId: 9, tile: { x: 4, y: 4 } }
    ])
  })

  it('skips blocked and out-of-bounds candidates without stacking', () => {
    const grid = createNavigationGrid({
      width: 3,
      height: 3,
      blockedTiles: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 1 }
      ]
    })

    const destinations = resolveGroupDestinations(grid, [4, 3, 2, 1], { x: 1, y: 1 })

    expect(destinations).toEqual([
      { unitId: 1, tile: { x: 2, y: 2 } },
      { unitId: 2, tile: { x: 1, y: 2 } },
      { unitId: 3, tile: { x: 0, y: 2 } },
      { unitId: 4, tile: { x: 0, y: 1 } }
    ])
    expect(new Set(destinations.map((destination) => `${destination.tile.x},${destination.tile.y}`)).size).toBe(4)
  })

  it('returns the same assignments for repeated calls', () => {
    const grid = createNavigationGrid({ width: 8, height: 8, blockedTiles: [{ x: 3, y: 3 }] })

    const first = resolveGroupDestinations(grid, [7, 4, 9], { x: 3, y: 3 })
    const second = resolveGroupDestinations(grid, [7, 4, 9], { x: 3, y: 3 })

    expect(second).toEqual(first)
  })
})
