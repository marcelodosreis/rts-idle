import { BUILDING_DEFINITIONS, UNIT_PRODUCTION_DEFINITIONS } from '@rts/game-data'
import type { BuildCatalogEntry, ProductionCatalogEntry, ScenarioSummary } from '@rts/protocol'
import { DEMO_SCENARIOS } from '../content/demo/scenarios.js'

export const BUILDINGS: readonly BuildCatalogEntry[] = Object.values(BUILDING_DEFINITIONS).map((definition) => ({
  type: definition.type,
  label: definition.label,
  footprint: { ...definition.footprint },
  costMinerals: definition.costMinerals,
  constructionTicks: definition.constructionTicks,
  supplyProvided: definition.supplyProvided
}))

export const SCENARIOS: readonly ScenarioSummary[] = DEMO_SCENARIOS.map(({ id, label }) => ({ id, label }))

export const PRODUCTION: readonly ProductionCatalogEntry[] = Object.values(UNIT_PRODUCTION_DEFINITIONS).map(
  (definition) => ({ ...definition })
)
