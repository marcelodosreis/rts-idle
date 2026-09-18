import { type AutoTileTerrain, enforceWaterBorder, gridToMapDefinition, mapDefinitionToGrid } from '@rts/renderer'
import { describe, expect, it } from 'vitest'

function grid(rows: readonly string[]): AutoTileTerrain[][] {
  return rows.map((row) =>
    [...row].map((char: string): AutoTileTerrain => {
      if (char === 'w') {
        return 'water'
      }
      if (char === 'e') {
        return 'elevated'
      }
      return 'land'
    })
  )
}

describe('gridToMapDefinition', () => {
  it('converts a 2D grid to a flat row-major tile list', () => {
    const map = gridToMapDefinition(grid(['www', 'wew', 'www']))
    expect(map.width).toBe(3)
    expect(map.height).toBe(3)
    expect(map.tiles).toEqual(['water', 'water', 'water', 'water', 'elevated', 'water', 'water', 'water', 'water'])
  })

  it('converts stair entries into typed StairEntry objects', () => {
    const map = gridToMapDefinition(grid(['lll', 'lll', 'lll']), {
      stairs: [
        ['1,0', 'left'],
        ['0,1', 'right']
      ]
    })
    expect(map.stairs).toEqual([
      { x: 1, y: 0, direction: 'left' },
      { x: 0, y: 1, direction: 'right' }
    ])
  })

  it('carries palette and decoration seed through', () => {
    const map = gridToMapDefinition(grid(['lll', 'lll', 'lll']), { palette: 'color3', decorationSeed: 42 })
    expect(map.palette).toBe('color3')
    expect(map.decorationSeed).toBe(42)
  })
})

describe('enforceWaterBorder', () => {
  it('forces every border cell to water, keeping the interior', () => {
    const bordered = enforceWaterBorder(grid(['lll', 'lel', 'lll']))
    expect(bordered).toEqual(grid(['www', 'wew', 'www']))
  })

  it('forces water borders on export to MapDefinition', () => {
    const map = gridToMapDefinition(grid(['lll', 'lll', 'lll']))
    expect(map.tiles).toEqual(['water', 'water', 'water', 'water', 'land', 'water', 'water', 'water', 'water'])
  })

  it('forces water borders on import from MapDefinition', () => {
    const map = gridToMapDefinition(grid(['lll', 'lll', 'lll']))
    const conversion = mapDefinitionToGrid(map)
    expect(conversion.grid).toEqual(grid(['www', 'wlw', 'www']))
  })
})

describe('mapDefinitionToGrid', () => {
  it('converts a flat tile list back to a 2D grid, flattening elevated to land', () => {
    const map = gridToMapDefinition(grid(['www', 'wew', 'www']))
    const conversion = mapDefinitionToGrid(map)
    expect(conversion.grid).toEqual(grid(['www', 'wlw', 'www']))
  })

  it('drops stairs (disabled for gameplay)', () => {
    const map = gridToMapDefinition(grid(['ll', 'll']), {
      stairs: [
        ['1,0', 'left'],
        ['0,1', 'right']
      ]
    })
    const conversion = mapDefinitionToGrid(map)
    expect(conversion.stairs.size).toBe(0)
  })
})

describe('grid ↔ map round-trip', () => {
  it('preserves grid (elevated flattened), drops stairs, preserves palette and seed', () => {
    const original = grid(['wwww', 'weew', 'wllw', 'wwww'])
    const stairs: [string, 'left' | 'right'][] = [
      ['1,1', 'left'],
      ['2,2', 'right']
    ]
    const map = gridToMapDefinition(original, { stairs, palette: 'color5', decorationSeed: 7 })
    const conversion = mapDefinitionToGrid(map)
    expect(conversion.grid).toEqual(grid(['wwww', 'wllw', 'wllw', 'wwww']))
    expect(conversion.stairs.size).toBe(0)
    expect(map.palette).toBe('color5')
    expect(map.decorationSeed).toBe(7)
  })

  it('defaults missing stairs to an empty map', () => {
    const map = gridToMapDefinition(grid(['ll']))
    const conversion = mapDefinitionToGrid(map)
    expect(conversion.stairs.size).toBe(0)
  })
})
