import { describe, expect, it } from 'vitest'
import { BUILDINGS, PRODUCTION, RESEARCH } from '../../../apps/server/src/bootstrap/catalog.js'

describe('server catalog projections', () => {
  it('preserves resource costs without a resource-specific projection', () => {
    expect(BUILDINGS.every((entry) => Object.keys(entry.cost).length > 0)).toBe(true)
    expect(PRODUCTION.every((entry) => Object.keys(entry.cost).length > 0)).toBe(true)
    expect(RESEARCH.every((entry) => Object.keys(entry.cost).length > 0)).toBe(true)
  })

  it('does not leak research implementation effects into MatchConfig', () => {
    expect(RESEARCH.every((entry) => !Object.hasOwn(entry, 'effects'))).toBe(true)
    expect(RESEARCH[0]).toMatchObject({ researchType: 'ATTACK', researchTicks: 600, minimumCastleTier: 2 })
  })
})
