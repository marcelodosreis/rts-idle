import type { DecorationPlacement, MapDefinition } from '@rts/game-data'
import { type AutoTileTerrain, dressTerrain } from '@rts/renderer'
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

const CONFIG = {
  counts: { bush: 10, tree: 10, rock: 10, cloud: 10, water_rock: 10, gold: 5 },
  variants: { bush: 4, tree: 4, rock: 4, cloud: 8, water_rock: 4, gold: 1 }
}

describe('dressTerrain', () => {
  it('is deterministic for the same seed and grid', () => {
    const g = grid(['lllll', 'lllll', 'lwwwl', 'lwwwl', 'lllll'])
    const a = dressTerrain(g, 42, CONFIG)
    const b = dressTerrain(g, 42, CONFIG)
    expect(a).toEqual(b)
  })

  it('differs for different seeds', () => {
    const g = grid(['lllll', 'lllll', 'lwwwl', 'lwwwl', 'lllll'])
    const a = dressTerrain(g, 1, CONFIG)
    const b = dressTerrain(g, 2, CONFIG)
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b))
  })

  it('never overlaps tiles', () => {
    const g = grid(['lllll', 'lllll', 'lwwwl', 'lwwwl', 'lllll'])
    const items = dressTerrain(g, 7, CONFIG)
    const seen = new Set<string>()
    for (const item of items) {
      const cell = `${item.x},${item.y}`
      expect(seen.has(cell)).toBe(false)
      seen.add(cell)
    }
  })

  it('respects host terrain (water_rock only on water, land kinds only on land)', () => {
    const g = grid(['lwl', 'lwl', 'lwl'])
    const items = dressTerrain(g, 3, { counts: { water_rock: 99, rock: 99 }, variants: { water_rock: 4, rock: 4 } })
    for (const item of items) {
      if (item.kind === 'water_rock') {
        expect(g[item.y]![item.x]).toBe('water')
      } else {
        expect(g[item.y]![item.x]).toBe('land')
      }
    }
  })

  it('respects max counts and disabled kinds', () => {
    const g = grid(['llll', 'llll', 'llll', 'llll'])
    const items = dressTerrain(g, 5, { counts: { tree: 2, bush: 0 }, variants: { tree: 4, bush: 4 } })
    expect(items.every((i) => i.kind === 'tree')).toBe(true)
    expect(items).toHaveLength(2)
  })

  it('returns variant within range', () => {
    const g = grid(['llll', 'llll', 'llll', 'llll'])
    const items = dressTerrain(g, 11, { counts: { cloud: 99 }, variants: { cloud: 8 } })
    for (const item of items) {
      expect(item.variant).toBeGreaterThanOrEqual(0)
      expect(item.variant).toBeLessThan(8)
    }
  })
})

// Compile-level contract for EDITOR-001: a MapDefinition accepts explicit
// decorations and scatter counts as optional fields.
describe('MapDefinition decoration contract', () => {
  it('type-checks explicit decorations and decoration counts', () => {
    const decorations: readonly DecorationPlacement[] = [
      { x: 1, y: 2, kind: 'tree', variant: 3 },
      { x: 4, y: 0, kind: 'gold' }
    ]
    const map: MapDefinition = {
      width: 2,
      height: 2,
      tiles: ['water', 'water', 'water', 'land'],
      decorations,
      decorationCounts: { bush: 2, rock: 1 }
    }
    expect(map.decorations).toBe(decorations)
    expect(map.decorationCounts).toEqual({ bush: 2, rock: 1 })
  })
})
