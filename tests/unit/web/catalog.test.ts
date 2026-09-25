import type { AssetEntry } from '@rts/shared'
import { describe, expect, it } from 'vitest'
import {
  buildCatalog,
  groupKeysByDepth,
  searchKeys
} from '../../../apps/web/src/features/laboratory/browser/catalog.js'

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

describe('groupKeysByDepth', () => {
  it('returns empty when all groups have a single key', () => {
    const keys = ['units.blue.archer.archer_idle', 'units.black.pawn.pawn_idle']
    expect(groupKeysByDepth(keys, 2)).toEqual([])
  })

  it('groups by depth with single keys omitted', () => {
    const keys = ['units.blue.archer.archer_idle', 'units.blue.archer.archer_run', 'units.blue.pawn.pawn_idle']
    const groups = groupKeysByDepth(keys, 2)
    expect(groups).toEqual([
      { name: 'archer', keys: ['units.blue.archer.archer_idle', 'units.blue.archer.archer_run'] }
    ])
  })

  it('returns sorted groups alphabetically', () => {
    const keys = [
      'units.blue.warrior.warrior_idle',
      'units.blue.archer.archer_idle',
      'units.blue.archer.archer_run',
      'units.blue.warrior.warrior_run'
    ]
    const groups = groupKeysByDepth(keys, 2)
    expect(groups.map((g) => g.name)).toEqual(['archer', 'warrior'])
  })

  it('uses last segment as fallback when depth exceeds key length', () => {
    const keys = ['terrain.decorations.rock1', 'terrain.decorations.rock2']
    const groups = groupKeysByDepth(keys, 4)
    expect(groups).toEqual([])
  })

  it('handles depth 1 grouping (faction level)', () => {
    const keys = ['units.blue.archer.archer_idle', 'units.blue.archer.archer_run', 'units.black.pawn.pawn_idle']
    const groups = groupKeysByDepth(keys, 1)
    expect(groups.map((g) => g.name)).toEqual(['blue'])
  })
})
