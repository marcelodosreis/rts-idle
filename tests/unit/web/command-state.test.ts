import type { ProductionCatalogEntry } from '@rts/protocol'
import { describe, expect, it } from 'vitest'
import { canCommandConstruction, trainingBlockReason } from '../../../apps/web/src/features/match/ui/command-state'
import type { HudConstruction } from '../../../apps/web/src/features/match/ui/types'

const PAWN: ProductionCatalogEntry = {
  unitKind: 'pawn',
  producer: 'CASTLE',
  cost: { GOLD: 50 },
  trainingTicks: 100,
  supply: 1
}

describe('HUD command availability', () => {
  it('explains insufficient supply using used and reserved supply', () => {
    expect(
      trainingBlockReason(
        PAWN,
        {
          resources: { GOLD: 500, WOOD: 0 },
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

  it('reports gold before allowing an unaffordable command', () => {
    expect(
      trainingBlockReason(
        PAWN,
        {
          resources: { GOLD: 20, WOOD: 0 },
          supply: 0,
          reservedSupply: 0,
          supplyCap: 10,
          castleTier: 1,
          completedResearch: [],
          queuedResearch: []
        },
        0
      )
    ).toBe('Requires 50 gold. You have 20.')
  })
})

describe('construction command gating', () => {
  const CASTLE: HudConstruction = {
    id: 1,
    buildingType: 'CASTLE',
    owner: 0,
    status: 'COMPLETED',
    progressTicks: 100,
    totalTicks: 100,
    builderId: null
  }

  it('allows commands only for the human player construction', () => {
    expect(canCommandConstruction(CASTLE, 0)).toBe(true)
    expect(canCommandConstruction({ ...CASTLE, owner: 1 }, 0)).toBe(false)
  })
})
