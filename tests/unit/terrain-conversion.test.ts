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

  it('carries decoration counts through', () => {
    const map = gridToMapDefinition(grid(['lll', 'lll', 'lll']), {
      decorationCounts: { bush: 3, gold: 1 }
    })
    expect(map.decorationCounts).toEqual({ bush: 3, gold: 1 })
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
  it('converts a flat tile list back to a 2D grid, preserving elevated', () => {
    const map = gridToMapDefinition(grid(['www', 'wew', 'www']))
    const conversion = mapDefinitionToGrid(map)
    expect(conversion.grid).toEqual(grid(['www', 'wew', 'www']))
  })

  it('converts typed stairs back to a "x,y" keyed map', () => {
    const map = gridToMapDefinition(grid(['ll', 'll']), {
      stairs: [
        ['1,0', 'left'],
        ['0,1', 'right']
      ]
    })
    const conversion = mapDefinitionToGrid(map)
    expect([...conversion.stairs.entries()]).toEqual([
      ['1,0', 'left'],
      ['0,1', 'right']
    ])
  })

  it('carries explicit decorations through', () => {
    const decorations = [{ x: 1, y: 1, kind: 'tree' as const, variant: 2 }]
    const map = gridToMapDefinition(grid(['lll', 'lll', 'lll']), { decorations })
    expect(mapDefinitionToGrid(map).decorations).toEqual(decorations)
  })
})

describe('grid ↔ map round-trip', () => {
  it('preserves grid, stairs, decorations, palette and seed', () => {
    const original = grid(['wwww', 'weew', 'wllw', 'wwww'])
    const stairs: [string, 'left' | 'right'][] = [
      ['1,1', 'left'],
      ['2,2', 'right']
    ]
    const decorations = [{ x: 2, y: 1, kind: 'gold' as const }]
    const map = gridToMapDefinition(original, {
      stairs,
      decorations,
      palette: 'color5',
      decorationSeed: 7,
      decorationCounts: { bush: 2 }
    })
    const conversion = mapDefinitionToGrid(map)
    expect(conversion.grid).toEqual(original)
    expect([...conversion.stairs.entries()]).toEqual(stairs)
    expect(conversion.decorations).toEqual(decorations)
    expect(map.palette).toBe('color5')
    expect(map.decorationSeed).toBe(7)
    expect(map.decorationCounts).toEqual({ bush: 2 })
  })

  it('defaults missing stairs and decorations to empty', () => {
    const map = gridToMapDefinition(grid(['ll']))
    const conversion = mapDefinitionToGrid(map)
    expect(conversion.stairs.size).toBe(0)
    expect(conversion.decorations).toEqual([])
  })
})
