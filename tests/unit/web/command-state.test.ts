import type { ProductionCatalogEntry } from '@rts/protocol'
import { describe, expect, it } from 'vitest'
import { trainingBlockReason } from '../../../apps/web/src/features/match/ui/command-state'

const PAWN: ProductionCatalogEntry = {
  unitKind: 'pawn',
  producer: 'CASTLE',
  costMinerals: 50,
  trainingTicks: 100,
  supply: 1
}

describe('HUD command availability', () => {
  it('explains insufficient supply using used and reserved supply', () => {
    expect(
      trainingBlockReason(
        PAWN,
        {
          mineral: 500,
          supply: 7,
          reservedSupply: 3,
          supplyCap: 10,
          castleTier: 1,
          completedResearch: [],
          queuedResearch: []
        },
        0
      )
    ).toBe('Insufficient supply. Requires 1; 0 available.')
  })

  it('reports minerals before allowing an unaffordable command', () => {
    expect(
      trainingBlockReason(
        PAWN,
        {
          mineral: 20,
          supply: 0,
          reservedSupply: 0,
          supplyCap: 10,
          castleTier: 1,
          completedResearch: [],
          queuedResearch: []
        },
        0
      )
    ).toBe('Requires 50 minerals. You have 20.')
  })
})
