import type { AssetEntry } from '@rts/shared'
import { describe, expect, it } from 'vitest'
import { buildCatalog, searchKeys } from '../../apps/web/src/sprites/catalog.js'

function entry(partial: Partial<AssetEntry>): AssetEntry {
  return {
    key: partial.key ?? 'x',
    file: partial.file ?? 'x.png',
    kind: partial.kind ?? 'static',
    cellW: partial.cellW ?? 64,
    cellH: partial.cellH ?? 64,
    frames: partial.frames ?? 1,
    anchorX: partial.anchorX ?? 0.5,
    anchorY: partial.anchorY ?? 0.5
  }
}

describe('buildCatalog', () => {
  it('groups keys by category and subcategory with stable ordering', () => {
    const map = new Map<string, AssetEntry>([
      ['terrain.decorations.rock1', entry({ key: 'terrain.decorations.rock1' })],
      ['terrain.resources.wood.wood_resource', entry({ key: 'terrain.resources.wood.wood_resource' })],
      ['terrain.decorations.rubber_duck', entry({ key: 'terrain.decorations.rubber_duck' })],
      ['fx.fire_01', entry({ key: 'fx.fire_01' })]
    ])
    const catalog = buildCatalog(map)

    expect(catalog.categories.map((c) => c.name)).toEqual(['fx', 'terrain'])
    const terrain = catalog.categories[1]!
    expect(terrain.subcategories.map((s) => s.name)).toEqual(['decorations', 'resources'])
    expect(terrain.subcategories[0]!.keys).toEqual(['terrain.decorations.rock1', 'terrain.decorations.rubber_duck'])
    expect(terrain.count).toBe(3)
  })

  it('orders keys alphabetically for stable prev/next navigation', () => {
    const map = new Map<string, AssetEntry>([
      ['units.b.lancer', entry({ key: 'units.b.lancer' })],
      ['units.a.pawn', entry({ key: 'units.a.pawn' })]
    ])
    const catalog = buildCatalog(map)
    expect(catalog.orderedKeys).toEqual(['units.a.pawn', 'units.b.lancer'])
  })

  it('includes every asset, unique or not', () => {
    const map = new Map<string, AssetEntry>([
      ['terrain.decorations.rubber_duck', entry({ key: 'terrain.decorations.rubber_duck' })],
      ['terrain.resources.meat.meat_resource', entry({ key: 'terrain.resources.meat.meat_resource' })]
    ])
    const catalog = buildCatalog(map)
    expect(catalog.orderedKeys).toHaveLength(2)
  })
})

describe('searchKeys', () => {
  const keys = ['terrain.decorations.rock1', 'fx.fire_01', 'units.blue.pawn.pawn_idle']

  it('returns all keys for an empty query', () => {
    expect(searchKeys(keys, '')).toEqual(keys)
    expect(searchKeys(keys, '   ')).toEqual(keys)
  })

  it('filters case-insensitively by substring', () => {
    expect(searchKeys(keys, 'ROCK')).toEqual(['terrain.decorations.rock1'])
    expect(searchKeys(keys, 'blue')).toEqual(['units.blue.pawn.pawn_idle'])
  })

  it('returns empty when nothing matches', () => {
    expect(searchKeys(keys, 'zzz')).toEqual([])
  })
})
