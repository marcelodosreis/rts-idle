import type { MapDefinition } from '@rts/game-data'
import { type AutoTileTerrain, gridToMapDefinition, mapDefinitionToGrid, mapToTerrainSceneInput } from '@rts/renderer'
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

// `mapToTerrainSceneInput` is the single seam shared by the editor and the
// game's `TerrainLayer`. These tests pin the editor↔game parity contract:
// both must derive identical grid, stairs, and dressing from a MapDefinition.
describe('mapToTerrainSceneInput', () => {
  it('derives grid and stairs identical to mapDefinitionToGrid', () => {
    const map = gridToMapDefinition(grid(['wwww', 'weew', 'wllw', 'wwww']), {
      stairs: [
        ['1,1', 'left'],
        ['2,2', 'right']
      ]
    })

    const conversion = mapDefinitionToGrid(map)
    const input = mapToTerrainSceneInput(map)

    expect(input.grid).toEqual(conversion.grid)
    expect([...input.stairs.entries()]).toEqual([...conversion.stairs.entries()])
  })

  it('preserves elevated terrain through the shared input', () => {
    const map = gridToMapDefinition(grid(['www', 'wew', 'www']))
    expect(mapToTerrainSceneInput(map).grid).toEqual(grid(['www', 'wew', 'www']))
  })

  it('carries decoration counts as dressing counts', () => {
    const map: MapDefinition = {
      width: 2,
      height: 2,
      tiles: ['water', 'water', 'water', 'land'],
      decorationSeed: 42,
      decorationCounts: { bush: 3, rock: 1 }
    }
    expect(mapToTerrainSceneInput(map).dressing).toEqual({
      seed: 42,
      counts: { bush: 3, rock: 1 }
    })
  })

  it('defaults seed to 1 and counts to empty when the map omits them', () => {
    const map = gridToMapDefinition(grid(['ll']))
    expect(mapToTerrainSceneInput(map).dressing).toEqual({ seed: 1, counts: {} })
  })

  it('maps explicit decorations to the "x,y"-keyed scene map', () => {
    const map = gridToMapDefinition(grid(['lll', 'lll', 'lll']), {
      decorations: [
        { x: 1, y: 1, kind: 'tree', variant: 2 },
        { x: 2, y: 0, kind: 'gold' }
      ]
    })
    const decorations = mapToTerrainSceneInput(map).decorations
    expect(decorations.get('1,1')).toEqual({ kind: 'tree', variant: 2 })
    expect(decorations.get('2,0')).toEqual({ kind: 'gold', variant: 0 })
  })

  it('has no explicit decorations when the map omits them', () => {
    const map = gridToMapDefinition(grid(['ll']))
    expect(mapToTerrainSceneInput(map).decorations.size).toBe(0)
  })
})
