import {
  BUILDING_DEFINITIONS,
  MECHANICAL_REPAIR,
  RESEARCH_DEFINITIONS,
  UNIT_DEFINITIONS,
  UNIT_PRODUCTION_DEFINITIONS
} from '@rts/game-data'
import { describe, expect, it } from 'vitest'

describe('game-data economy capabilities', () => {
  it('defines worker behavior through capabilities instead of a unit kind rule', () => {
    expect(UNIT_DEFINITIONS.pawn).toMatchObject({
      canGather: true,
      canBuild: true,
      canRepair: true,
      acceptsDeposit: true,
      cargoCapacity: 10,
      repairProfile: MECHANICAL_REPAIR
    })
  })

  it('defines producer and research requirements in catalogs', () => {
    expect(BUILDING_DEFINITIONS.CASTLE.capabilities.canProduce).toBe(true)
    expect(BUILDING_DEFINITIONS.MONASTERY.capabilities.canResearch).toBe(true)
    expect(UNIT_PRODUCTION_DEFINITIONS.lancer.minimumCastleTier).toBe(2)
    expect(RESEARCH_DEFINITIONS.ATTACK.minimumCastleTier).toBe(2)
  })
})
