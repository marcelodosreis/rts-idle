import { checkKeyContract, validateAsset } from '@rts/renderer'
import type { AssetEntry } from '@rts/shared'
import { describe, expect, it } from 'vitest'

function entry(overrides: Partial<AssetEntry>): AssetEntry {
  return {
    key: 'test.asset',
    file: 'test.png',
    kind: 'static',
    cellW: 64,
    cellH: 64,
    frames: 1,
    anchorX: 0.5,
    anchorY: 0.5,
    ...overrides
  }
}

function rgba(width: number, height: number, paint: (x: number, y: number) => number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = paint(x, y)
      out[(y * width + x) * 4 + 3] = alpha
    }
  }
  return out
}

function full(width: number, height: number): Uint8ClampedArray {
  return rgba(width, height, () => 255)
}

const codes = (issues: readonly { readonly code: string }[]): readonly string[] => issues.map((i) => i.code)

describe('validateAsset geometry', () => {
  it('accepts a clean static', () => {
    const asset = entry({ key: 'ui.panels.wood_table' })
    expect(validateAsset(asset, { geometry: { width: 64, height: 64 } })).toEqual([])
  })

  it('flags strip width not divisible by height', () => {
    const asset = entry({ key: 'fx.explosion_01', kind: 'strip', cellW: 100, cellH: 64, frames: 3 })
    const issues = validateAsset(asset, { geometry: { width: 200, height: 64 } })
    expect(codes(issues)).toContain('strip-cell-mismatch')
  })

  it('flags strip frame count mismatch', () => {
    const asset = entry({ key: 'fx.explosion_01', kind: 'strip', cellW: 64, cellH: 64, frames: 2 })
    const issues = validateAsset(asset, { geometry: { width: 256, height: 64 } })
    expect(codes(issues)).toContain('strip-frame-count')
  })

  it('flags tileset grid mismatch', () => {
    const asset = entry({
      key: 'terrain.tileset.color1',
      kind: 'tileset',
      cellW: 64,
      cellH: 64,
      frames: 1,
      columns: 8,
      rows: 6
    })
    const issues = validateAsset(asset, { geometry: { width: 576, height: 384 } })
    expect(codes(issues)).toContain('tileset-columns')
  })

  it('flags static size mismatch', () => {
    const asset = entry({ key: 'ui.bars.smallbar_base', cellW: 128, cellH: 64 })
    const issues = validateAsset(asset, { geometry: { width: 320, height: 64 } })
    expect(codes(issues)).toContain('static-size-mismatch')
  })
})

describe('validateAsset frame pixels', () => {
  it('flags a blank frame', () => {
    const asset = entry({ key: 'test', kind: 'strip', cellW: 64, cellH: 64, frames: 2 })
    const frames = [
      { index: 0, rgba: full(64, 64) },
      { index: 1, rgba: rgba(64, 64, () => 0) }
    ]
    const issues = validateAsset(asset, { geometry: { width: 128, height: 64 }, frames })
    expect(codes(issues)).toContain('blank-frame')
  })

  it('warns when content touches the cell edge', () => {
    const asset = entry({ key: 'test', kind: 'strip', cellW: 64, cellH: 64, frames: 1 })
    const frames = [{ index: 0, rgba: full(64, 64) }]
    const issues = validateAsset(asset, { geometry: { width: 64, height: 64 }, frames })
    expect(codes(issues)).toContain('edge-touching')
  })

  it('warns on duplicate consecutive frames', () => {
    const asset = entry({ key: 'test', kind: 'strip', cellW: 4, cellH: 4, frames: 2 })
    const same = full(4, 4)
    const frames = [
      { index: 0, rgba: same },
      { index: 1, rgba: new Uint8ClampedArray(same) }
    ]
    const issues = validateAsset(asset, { geometry: { width: 8, height: 4 }, frames })
    expect(codes(issues)).toContain('duplicate-frame')
  })
})

describe('validateAsset metadata', () => {
  it('flags an anchor outside 0..1', () => {
    const asset = entry({ anchorX: 1.5, anchorY: 0.5 })
    const issues = validateAsset(asset, { geometry: { width: 64, height: 64 } })
    expect(codes(issues)).toContain('anchor-range')
  })

  it('warns on non-multiple-of-64 statics', () => {
    const asset = entry({ key: 'ui.test', cellW: 100, cellH: 64 })
    const issues = validateAsset(asset, { geometry: { width: 100, height: 64 } })
    expect(codes(issues)).toContain('non-64-cell')
  })
})

describe('checkKeyContract', () => {
  it('accepts a clean game-pattern unit key', () => {
    expect(checkKeyContract('units.blue.pawn.pawn_idle')).toEqual([])
  })

  it('accepts a kind-repeating anim segment (new convention)', () => {
    expect(checkKeyContract('units.blue.warrior.warrior_run')).toEqual([])
  })

  it('accepts a plain anim segment (lancer/monk style)', () => {
    expect(checkKeyContract('units.blue.lancer.idle')).toEqual([])
  })

  it('flags a non-unit key only when prefixed units.*', () => {
    expect(checkKeyContract('terrain.tileset.color1')).toEqual([])
  })

  it('accepts a unit projectile key (arrow)', () => {
    expect(checkKeyContract('units.blue.archer.arrow')).toEqual([])
  })
})
