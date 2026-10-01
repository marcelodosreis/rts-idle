import type { ResearchType, ResourceCost } from '@rts/shared'

export interface ResearchDefinition {
  readonly researchType: ResearchType
  readonly cost: ResourceCost
  readonly researchTicks: number
}

export const RESEARCH_DEFINITIONS: Readonly<Record<ResearchType, ResearchDefinition>> = Object.freeze({
  ATTACK: Object.freeze({ researchType: 'ATTACK', cost: { GOLD: 150 }, researchTicks: 600 }),
  DEFENSE: Object.freeze({ researchType: 'DEFENSE', cost: { GOLD: 150 }, researchTicks: 600 }),
  ECONOMY: Object.freeze({ researchType: 'ECONOMY', cost: { GOLD: 175 }, researchTicks: 700 }),
  MOVEMENT: Object.freeze({ researchType: 'MOVEMENT', cost: { GOLD: 175 }, researchTicks: 700 })
})
