import { SYSTEM_PIPELINE } from '@rts/simulation'
import { describe, expect, it } from 'vitest'

describe('economy consolidation boundaries', () => {
  it('keeps the frozen system order with economy before combat', () => {
    const names = SYSTEM_PIPELINE.map((step) => step.name)
    expect(names).toEqual([
      'orders',
      'movement',
      'economy',
      'heal',
      'tier',
      'research',
      'combat',
      'death',
      'supply',
      'production',
      'victory',
      'invariants'
    ])
    expect(names.indexOf('movement')).toBeLessThan(names.indexOf('economy'))
    expect(names.indexOf('economy')).toBeLessThan(names.indexOf('combat'))
    expect(Object.isFrozen(SYSTEM_PIPELINE)).toBe(true)
  })
})
