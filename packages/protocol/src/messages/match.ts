import {
  BUILDING_TYPES,
  type BuildingType,
  field,
  isOneOf,
  isRecord,
  type MapDefinition,
  normalizeMapDefinition,
  TRAINABLE_UNIT_KINDS,
  type TrainableUnitKind
} from '@rts/shared'

export const MATCH_AGGRESSIONS = ['offensive', 'passive'] as const

export type MatchAggression = (typeof MATCH_AGGRESSIONS)[number]

export interface ScenarioSummary {
  readonly id: string
  readonly label: string
}

export interface BuildCatalogEntry {
  readonly type: BuildingType
  readonly label: string
  readonly footprint: { readonly width: number; readonly height: number }
  readonly costMinerals: number
  readonly constructionTicks: number
  readonly supplyProvided?: number
}

export interface ProductionCatalogEntry {
  readonly unitKind: TrainableUnitKind
  readonly producer: Extract<BuildingType, 'BASE' | 'BARRACKS'>
  readonly costMinerals: number
  readonly trainingTicks: number
  readonly supply: number
}

export interface MatchRequest {
  readonly type: 'match_request'
  readonly scenarioId: string
  readonly aggression: MatchAggression
  readonly map: { readonly source: 'catalog' } | { readonly source: 'local'; readonly definition: MapDefinition }
}

export interface MatchConfig {
  readonly type: 'match_config'
  readonly scenario: ScenarioSummary
  readonly scenarios: readonly ScenarioSummary[]
  readonly map: MapDefinition
  readonly buildings: readonly BuildCatalogEntry[]
  readonly production: readonly ProductionCatalogEntry[]
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

export function isMatchRequest(value: unknown): value is MatchRequest {
  if (!isRecord(value)) {
    return false
  }
  const map = field(value, 'map')
  if (
    field(value, 'type') !== 'match_request' ||
    !isNonEmptyString(field(value, 'scenarioId')) ||
    !isOneOf(MATCH_AGGRESSIONS, field(value, 'aggression')) ||
    !isRecord(map)
  ) {
    return false
  }
  const source = field(map, 'source')
  if (source === 'catalog') {
    return Object.keys(map).length === 1
  }
  return source === 'local' && normalizeMapDefinition(field(map, 'definition')).ok
}

export function isScenarioSummary(value: unknown): value is ScenarioSummary {
  return isRecord(value) && isNonEmptyString(field(value, 'id')) && typeof field(value, 'label') === 'string'
}

function isBuildCatalogEntry(value: unknown): value is BuildCatalogEntry {
  if (!isRecord(value)) {
    return false
  }
  const footprint = field(value, 'footprint')
  if (
    !isOneOf(BUILDING_TYPES, field(value, 'type')) ||
    typeof field(value, 'label') !== 'string' ||
    !isPositiveInteger(field(value, 'costMinerals')) ||
    !isPositiveInteger(field(value, 'constructionTicks')) ||
    !isRecord(footprint)
  ) {
    return false
  }
  return isPositiveInteger(field(footprint, 'width')) && isPositiveInteger(field(footprint, 'height'))
}

function isProductionCatalogEntry(value: unknown): value is ProductionCatalogEntry {
  return (
    isRecord(value) &&
    isOneOf(TRAINABLE_UNIT_KINDS, field(value, 'unitKind')) &&
    (field(value, 'producer') === 'BASE' || field(value, 'producer') === 'BARRACKS') &&
    isPositiveInteger(field(value, 'costMinerals')) &&
    isPositiveInteger(field(value, 'trainingTicks')) &&
    isPositiveInteger(field(value, 'supply'))
  )
}

/** Type guard for server-provided match configuration at the browser boundary. */
export function isMatchConfig(value: unknown): value is MatchConfig {
  if (!isRecord(value)) {
    return false
  }
  const scenarios = field(value, 'scenarios')
  const buildings = field(value, 'buildings')
  const production = field(value, 'production')
  return (
    field(value, 'type') === 'match_config' &&
    isScenarioSummary(field(value, 'scenario')) &&
    Array.isArray(scenarios) &&
    scenarios.every(isScenarioSummary) &&
    normalizeMapDefinition(field(value, 'map')).ok &&
    Array.isArray(buildings) &&
    buildings.every(isBuildCatalogEntry) &&
    Array.isArray(production) &&
    production.every(isProductionCatalogEntry)
  )
}
