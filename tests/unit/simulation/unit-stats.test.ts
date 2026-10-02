import { UNIT_DEFINITIONS, unitDefinitionFor } from '@rts/game-data'
import { describe, expect, it } from 'vitest'

describe('unit combat stats by kind', () => {
  it('balances melee and ranged roles distinctly', () => {
    expect(UNIT_DEFINITIONS.warrior).toMatchObject({
      maxHp: 150,
      damage: 15,
      rangeTiles: 1,
      cooldownTicks: 20,
      mechanical: true
    })
    expect(UNIT_DEFINITIONS.archer).toMatchObject({
      maxHp: 60,
      damage: 8,
      rangeTiles: 3,
      cooldownTicks: 20,
      mechanical: true
    })
    expect(UNIT_DEFINITIONS.pawn).toMatchObject({
      maxHp: 100,
      damage: 10,
      rangeTiles: 1,
      cooldownTicks: 20,
      mechanical: true
    })
  })

  it('resolves stats per kind', () => {
    expect(unitDefinitionFor('warrior')).toBe(UNIT_DEFINITIONS.warrior)
    expect(unitDefinitionFor('archer')).toBe(UNIT_DEFINITIONS.archer)
  })

  it('gives Lancer a two-tile spear range', () => {
    expect(UNIT_DEFINITIONS.lancer.rangeTiles).toBe(2)
  })
})
