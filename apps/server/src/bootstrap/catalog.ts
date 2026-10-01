import { BUILDING_DEFINITIONS, RESEARCH_DEFINITIONS, UNIT_PRODUCTION_DEFINITIONS } from '@rts/game-data'
import type { BuildCatalogEntry, ProductionCatalogEntry, ResearchCatalogEntry, ScenarioSummary } from '@rts/protocol'
import { DEMO_SCENARIOS } from '../content/demo/scenarios.js'

export const BUILDINGS: readonly BuildCatalogEntry[] = Object.values(BUILDING_DEFINITIONS).map((definition) => ({
  type: definition.type,
  label: definition.label,
  footprint: { ...definition.footprint },
  cost: { GOLD: definition.cost.GOLD ?? 0, WOOD: definition.cost.WOOD ?? 0 },
  constructionTicks: definition.constructionTicks,
  supplyProvided: definition.supplyProvided
}))

export const SCENARIOS: readonly ScenarioSummary[] = DEMO_SCENARIOS.map(({ id, label }) => ({ id, label }))

export const PRODUCTION: readonly ProductionCatalogEntry[] = Object.values(UNIT_PRODUCTION_DEFINITIONS).map(
  (definition) => ({ ...definition, cost: { GOLD: definition.cost.GOLD ?? 0, WOOD: definition.cost.WOOD ?? 0 } })
)

export const RESEARCH: readonly ResearchCatalogEntry[] = Object.values(RESEARCH_DEFINITIONS).map((definition) => ({
  ...definition,
  cost: { GOLD: definition.cost.GOLD ?? 0, WOOD: definition.cost.WOOD ?? 0 }
}))
