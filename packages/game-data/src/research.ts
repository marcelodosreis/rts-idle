import type { ResearchType } from '@rts/shared'

export interface ResearchDefinition {
  readonly researchType: ResearchType
  readonly costMinerals: number
  readonly researchTicks: number
}

export const RESEARCH_DEFINITIONS: Readonly<Record<ResearchType, ResearchDefinition>> = Object.freeze({
  ATTACK: Object.freeze({ researchType: 'ATTACK', costMinerals: 150, researchTicks: 600 }),
  DEFENSE: Object.freeze({ researchType: 'DEFENSE', costMinerals: 150, researchTicks: 600 }),
  ECONOMY: Object.freeze({ researchType: 'ECONOMY', costMinerals: 175, researchTicks: 700 }),
  MOVEMENT: Object.freeze({ researchType: 'MOVEMENT', costMinerals: 175, researchTicks: 700 })
})
