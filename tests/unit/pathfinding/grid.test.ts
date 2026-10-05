import { createNavigationGrid, createNavigationGridFromMap, type NavigationGrid } from '@rts/pathfinding'
import { FIXED_SCALE, type MapDefinition } from '@rts/shared'
import { describe, expect, it } from 'vitest'

function openGrid(width = 4, height = 3): NavigationGrid {
  return createNavigationGrid({ width, height, blockedTiles: [] })
}

function mapWithWaterAndResource(): MapDefinition {
  return {
    width: 3,
    height: 2,
    tiles: ['land', 'water', 'land', 'land', 'land', 'elevated'],
    resources: [
      {
        resourceId: 1,
        kind: 'TREE',
        x: 2 * FIXED_SCALE + 1,
        y: FIXED_SCALE + 1,
        variant: 0,
        initialAmount: 100,
        harvestAmount: 10,
        harvestTicks: 10,
        blocksNavigation: false
      }
    ]
  }
}

describe('navigation grid', () => {
  it('round-trips row-major coordinates and rejects out-of-bounds values', () => {
    const grid = openGrid()

    expect(grid.tileIndex({ x: 2, y: 1 })).toBe(6)
    expect(grid.coordinateFromTileIndex(6)).toEqual({ x: 2, y: 1 })
    expect(grid.tileIndex({ x: 4, y: 0 })).toBeNull()
    expect(grid.coordinateFromTileIndex(-1)).toBeNull()
    expect(grid.coordinateFromTileIndex(12)).toBeNull()
  })

  it('enumerates center neighbors in a stable cardinal-then-diagonal order', () => {
    const grid = openGrid()

    expect(grid.neighbors({ x: 1, y: 1 }).map((neighbor) => neighbor.direction)).toEqual([
      'N',
      'E',
      'S',
      'W',
      'NE',
      'SE',
      'SW',
      'NW'
    ])
  })

  it('does not allow diagonal corner cutting', () => {
    const grid = createNavigationGrid({
      width: 3,
      height: 3,
      blockedTiles: [
        { x: 1, y: 0 },
        { x: 0, y: 1 }
      ]
    })

    expect(grid.neighbors({ x: 1, y: 1 }).map((neighbor) => neighbor.direction)).toEqual(['E', 'S', 'SE'])
  })

  it('copies blocked tile input and keeps map water and resources blocked', () => {
    const blockedTiles = [{ x: 0, y: 0 }]
    const grid = createNavigationGrid({ width: 2, height: 2, blockedTiles })
    blockedTiles[0]!.x = 1

    expect(grid.isWalkable({ x: 0, y: 0 })).toBe(false)
    expect(grid.isWalkable({ x: 1, y: 0 })).toBe(true)

    const mapGrid = createNavigationGridFromMap(mapWithWaterAndResource())
    expect(mapGrid.isWalkable({ x: 1, y: 0 })).toBe(false)
    expect(mapGrid.isWalkable({ x: 2, y: 1 })).toBe(false)
    expect(mapGrid.isWalkable({ x: 0, y: 0 })).toBe(true)
  })

  it('rejects invalid grid dimensions and blocked coordinates', () => {
    expect(() => createNavigationGrid({ width: 0, height: 1, blockedTiles: [] })).toThrow(
      'navigation grid dimensions must be positive integers'
    )
    expect(() => createNavigationGrid({ width: 2, height: 2, blockedTiles: [{ x: 2, y: 0 }] })).toThrow(
      'blocked tile must be inside the navigation grid'
    )
  })
})
