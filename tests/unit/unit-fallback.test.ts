import { describe, expect, it } from 'vitest'
import { FALLBACK_GLYPH } from '../../packages/renderer/src/unit-fallback.js'

describe('FALLBACK_GLYPH', () => {
  it('maps each UnitKind to a distinct letter', () => {
    const letters = Object.values(FALLBACK_GLYPH).map((g) => g.letter)
    expect(new Set(letters).size).toBe(3)
  })

  it('uses the first letter of each kind name', () => {
    expect(FALLBACK_GLYPH.pawn.letter).toBe('P')
    expect(FALLBACK_GLYPH.warrior.letter).toBe('W')
    expect(FALLBACK_GLYPH.archer.letter).toBe('A')
  })

  it('assigns distinct shapes to each kind', () => {
    const shapes = Object.values(FALLBACK_GLYPH).map((g) => g.shape)
    expect(new Set(shapes).size).toBe(3)
  })

  it('uses circle for pawn, square for warrior, triangle for archer', () => {
    expect(FALLBACK_GLYPH.pawn.shape).toBe('circle')
    expect(FALLBACK_GLYPH.warrior.shape).toBe('square')
    expect(FALLBACK_GLYPH.archer.shape).toBe('triangle')
  })
})
