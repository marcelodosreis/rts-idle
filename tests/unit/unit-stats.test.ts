import { UNIT_STATS_BY_KIND, unitStatsFor } from '@rts/simulation'
import { describe, expect, it } from 'vitest'

describe('unit combat stats by kind', () => {
  it('balances melee and ranged roles distinctly', () => {
    expect(UNIT_STATS_BY_KIND.warrior).toEqual({ maxHp: 150, damage: 15, rangeTiles: 1, cooldownTicks: 20 })
    expect(UNIT_STATS_BY_KIND.archer).toEqual({ maxHp: 60, damage: 8, rangeTiles: 3, cooldownTicks: 20 })
    expect(UNIT_STATS_BY_KIND.pawn).toEqual({ maxHp: 100, damage: 10, rangeTiles: 1, cooldownTicks: 20 })
  })

  it('resolves stats per kind', () => {
    expect(unitStatsFor('warrior')).toBe(UNIT_STATS_BY_KIND.warrior)
    expect(unitStatsFor('archer')).toBe(UNIT_STATS_BY_KIND.archer)
  })
})
