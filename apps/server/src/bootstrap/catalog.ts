import { BUILDING_DEFINITIONS, RESEARCH_DEFINITIONS, UNIT_PRODUCTION_DEFINITIONS } from '@rts/game-data'
import type { BuildCatalogEntry, ProductionCatalogEntry, ResearchCatalogEntry, ScenarioSummary } from '@rts/protocol'
import { DEMO_SCENARIOS } from '../content/demo/scenarios.js'

export const BUILDINGS: readonly BuildCatalogEntry[] = Object.values(BUILDING_DEFINITIONS).map((definition) => ({
  type: definition.type,
  label: definition.label,
  footprint: { ...definition.footprint },
  cost: { ...definition.cost },
  constructionTicks: definition.constructionTicks,
  supplyProvided: definition.supplyProvided,
  capabilities: { ...definition.capabilities },
  ...(definition.minimumCastleTier === undefined ? {} : { minimumCastleTier: definition.minimumCastleTier }),
  ...(definition.maximumCastleTier === undefined ? {} : { maximumCastleTier: definition.maximumCastleTier })
}))

export const SCENARIOS: readonly ScenarioSummary[] = DEMO_SCENARIOS.map(({ id, label }) => ({ id, label }))

export const PRODUCTION: readonly ProductionCatalogEntry[] = Object.values(UNIT_PRODUCTION_DEFINITIONS).map(
  (definition) => ({
    unitKind: definition.unitKind,
    producer: definition.producer,
    cost: { ...definition.cost },
    trainingTicks: definition.trainingTicks,
    supply: definition.supply,
    ...(definition.minimumCastleTier === undefined ? {} : { minimumCastleTier: definition.minimumCastleTier })
  })
)

export const RESEARCH: readonly ResearchCatalogEntry[] = Object.values(RESEARCH_DEFINITIONS).map((definition) => ({
  researchType: definition.researchType,
  cost: { ...definition.cost },
  researchTicks: definition.researchTicks,
  minimumCastleTier: definition.minimumCastleTier
}))
