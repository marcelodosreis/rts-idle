import { FORMATION_SPACING, formationOffset } from '@rts/simulation'
import { describe, expect, it } from 'vitest'

describe('deterministic formation offsets', () => {
  it('places the first unit exactly on the target', () => {
    expect(formationOffset(0)).toEqual({ dx: 0, dy: 0 })
  })

  it('generates distinct offsets for 256 units', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 256; i += 1) {
      const offset = formationOffset(i)
      const key = `${offset.dx},${offset.dy}`
      expect(seen.has(key)).toBe(false)
      seen.add(key)
    }
  })

  it('is deterministic across calls', () => {
    const a = Array.from({ length: 100 }, (_, i) => formationOffset(i))
    const b = Array.from({ length: 100 }, (_, i) => formationOffset(i))
    expect(a).toEqual(b)
  })

  it('scales offsets by the spacing constant', () => {
    expect(formationOffset(1)).toEqual({ dx: FORMATION_SPACING, dy: 0 })
    for (let i = 0; i < 256; i += 1) {
      const offset = formationOffset(i)
      expect(Number.isInteger(offset.dx / FORMATION_SPACING)).toBe(true)
      expect(Number.isInteger(offset.dy / FORMATION_SPACING)).toBe(true)
    }
  })

  it('is symmetric around the target', () => {
    const offsets = Array.from({ length: 8 }, (_, i) => formationOffset(i + 1))
    const sumX = offsets.reduce((acc, o) => acc + o.dx, 0)
    const sumY = offsets.reduce((acc, o) => acc + o.dy, 0)
    expect(sumX).toBe(0)
    expect(sumY).toBe(0)
  })
})
