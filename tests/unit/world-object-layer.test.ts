import { describe, expect, it } from 'vitest'
import { buildingVisualStyle } from '../../packages/renderer/src/building-visual-style.js'

describe('building presentation styles', () => {
  it('uses the owner-colored Base style for initial and completed Bases', () => {
    expect(buildingVisualStyle('BASE', 'COMPLETED', 0)).toEqual({
      kind: 'base',
      fillColor: 0x2e7d32,
      fillAlpha: 0.8,
      strokeColor: 0xf8fafc
    })
    expect(buildingVisualStyle('BASE', 'COMPLETED', 1)).toEqual({
      kind: 'base',
      fillColor: 0xc62828,
      fillAlpha: 0.8,
      strokeColor: 0xf8fafc
    })
  })

  it('keeps Barracks distinct while using the same owner-color convention', () => {
    expect(buildingVisualStyle('BARRACKS', 'COMPLETED', 0)).toMatchObject({
      kind: 'barracks',
      fillColor: 0x2e7d32
    })
    expect(buildingVisualStyle('BARRACKS', 'COMPLETED', 0).kind).not.toBe('base')
  })

  it('preserves an owner-colored foundation state for progress rendering', () => {
    expect(buildingVisualStyle('BASE', 'UNDER_CONSTRUCTION', 0)).toEqual({
      kind: 'foundation',
      fillColor: 0x2e7d32,
      fillAlpha: 0.3,
      strokeColor: 0xfacc15
    })
  })
})
