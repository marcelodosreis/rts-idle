import { validateMapDefinition } from '@rts/game-data'
import { describe, expect, it } from 'vitest'

const VALID = {
  width: 2,
  height: 2,
  tiles: ['water', 'water', 'water', 'land'],
  stairs: [{ x: 1, y: 1, direction: 'left' as const }],
  palette: 'color2',
  decorationSeed: 9,
  decorations: [{ x: 1, y: 1, kind: 'tree' as const, variant: 1 }],
  decorationCounts: { bush: 3 }
}

describe('validateMapDefinition', () => {
  it('accepts and normalizes a valid definition', () => {
    const result = validateMapDefinition(VALID)
    expect(result.ok).toBe(true)
    expect(result.map).toEqual(VALID)
    expect(result.errors).toEqual([])
  })

  it('rejects non-objects', () => {
    expect(validateMapDefinition(null).ok).toBe(false)
    expect(validateMapDefinition('map').ok).toBe(false)
    expect(validateMapDefinition([]).ok).toBe(false)
  })

  it('rejects a tiles length that does not match width × height', () => {
    const result = validateMapDefinition({ ...VALID, tiles: ['water'] })
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('4 entries')
  })

  it('rejects unknown tile kinds', () => {
    const result = validateMapDefinition({ ...VALID, tiles: ['water', 'water', 'water', 'lava'] })
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('tiles[3]')
  })

  it('rejects unknown decoration kinds', () => {
    const result = validateMapDefinition({
      ...VALID,
      decorations: [{ x: 0, y: 0, kind: 'dragon' }]
    })
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('decorations[0]')
  })

  it('rejects malformed decoration counts', () => {
    const result = validateMapDefinition({ ...VALID, decorationCounts: { bush: -1 } })
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('decorationCounts.bush')
  })

  it('omits optional fields that are absent', () => {
    const result = validateMapDefinition({ width: 1, height: 1, tiles: ['land'] })
    expect(result.ok).toBe(true)
    expect(result.map).toEqual({ width: 1, height: 1, tiles: ['land'] })
  })
})
