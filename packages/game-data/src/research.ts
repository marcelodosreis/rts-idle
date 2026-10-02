import type { ResearchType, ResourceCost } from '@rts/shared'

export interface ResearchEffects {
  readonly damageBonus?: number
  readonly armorBonus?: number
  readonly cargoCapacity?: number
  readonly movementSpeedMultiplier?: { readonly numerator: number; readonly denominator: number }
}

export interface ResearchDefinition {
  readonly researchType: ResearchType
  readonly cost: ResourceCost
  readonly researchTicks: number
  readonly minimumCastleTier: 1 | 2 | 3
  readonly effects: ResearchEffects
}

export const RESEARCH_DEFINITIONS: Readonly<Record<ResearchType, ResearchDefinition>> = Object.freeze({
  ATTACK: Object.freeze({
    researchType: 'ATTACK',
    cost: { GOLD: 150 },
    researchTicks: 600,
    minimumCastleTier: 2,
    effects: { damageBonus: 2 }
  }),
  DEFENSE: Object.freeze({
    researchType: 'DEFENSE',
    cost: { GOLD: 150 },
    researchTicks: 600,
    minimumCastleTier: 2,
    effects: { armorBonus: 1 }
  }),
  ECONOMY: Object.freeze({
    researchType: 'ECONOMY',
    cost: { GOLD: 175 },
    researchTicks: 700,
    minimumCastleTier: 2,
    effects: { cargoCapacity: 12 }
  }),
  MOVEMENT: Object.freeze({
    researchType: 'MOVEMENT',
    cost: { GOLD: 175 },
    researchTicks: 700,
    minimumCastleTier: 2,
    effects: { movementSpeedMultiplier: { numerator: 11, denominator: 10 } }
  })
})
