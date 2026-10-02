import {
  BUILDING_TYPES,
  type BuildingType,
  type CastleTier,
  field,
  isOneOf,
  isOptionalNonNegativeInteger,
  isRecord,
  isResourceCost,
  type MapDefinition,
  normalizeMapDefinition,
  RESEARCH_TYPES,
  type ResearchType,
  type ResourceCost,
  TRAINABLE_UNIT_KINDS,
  type TrainableUnitKind
} from '@rts/shared'
import { PROTOCOL_VERSION } from '../protocol-version.js'

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
  readonly cost: ResourceCost
  readonly constructionTicks: number
  readonly supplyProvided?: number
  readonly capabilities?: {
    readonly canProduce: boolean
    readonly canResearch: boolean
    readonly canUpgrade: boolean
  }
  readonly minimumCastleTier?: CastleTier
  readonly maximumCastleTier?: CastleTier
}

export interface ProductionCatalogEntry {
  readonly unitKind: TrainableUnitKind
  readonly producer: BuildingType
  readonly cost: ResourceCost
  readonly trainingTicks: number
  readonly supply: number
  readonly minimumCastleTier?: CastleTier
}

export interface ResearchCatalogEntry {
  readonly researchType: ResearchType
  readonly cost: ResourceCost
  readonly researchTicks: number
  readonly minimumCastleTier?: CastleTier
}

export interface MatchRequest {
  readonly type: 'match_request'
  readonly protocolVersion: typeof PROTOCOL_VERSION
  readonly scenarioId: string
  readonly aggression: MatchAggression
  readonly map: { readonly source: 'catalog' } | { readonly source: 'local'; readonly definition: MapDefinition }
  readonly resumeToken?: string
}

export interface MatchConfig {
  readonly type: 'match_config'
  readonly protocolVersion: typeof PROTOCOL_VERSION
  readonly resumeToken: string
  readonly scenario: ScenarioSummary
  readonly scenarios: readonly ScenarioSummary[]
  readonly map: MapDefinition
  readonly buildings: readonly BuildCatalogEntry[]
  readonly production: readonly ProductionCatalogEntry[]
  readonly research: readonly ResearchCatalogEntry[]
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
  const resumeToken = field(value, 'resumeToken')
  if (
    field(value, 'type') !== 'match_request' ||
    field(value, 'protocolVersion') !== PROTOCOL_VERSION ||
    !isNonEmptyString(field(value, 'scenarioId')) ||
    !isOneOf(MATCH_AGGRESSIONS, field(value, 'aggression')) ||
    !isRecord(map) ||
    (resumeToken !== undefined && !isNonEmptyString(resumeToken))
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
  const capabilities = field(value, 'capabilities')
  const supplyProvided = field(value, 'supplyProvided')
  if (
    !isOneOf(BUILDING_TYPES, field(value, 'type')) ||
    typeof field(value, 'label') !== 'string' ||
    !isResourceCost(field(value, 'cost'), true) ||
    !isPositiveInteger(field(value, 'constructionTicks')) ||
    !isOptionalNonNegativeInteger(supplyProvided) ||
    !isRecord(footprint) ||
    (capabilities !== undefined &&
      (!isRecord(capabilities) ||
        typeof field(capabilities, 'canProduce') !== 'boolean' ||
        typeof field(capabilities, 'canResearch') !== 'boolean' ||
        typeof field(capabilities, 'canUpgrade') !== 'boolean')) ||
    !isOptionalCastleTier(field(value, 'minimumCastleTier')) ||
    !isOptionalCastleTier(field(value, 'maximumCastleTier'))
  ) {
    return false
  }
  return isPositiveInteger(field(footprint, 'width')) && isPositiveInteger(field(footprint, 'height'))
}

function isProductionCatalogEntry(value: unknown): value is ProductionCatalogEntry {
  return (
    isRecord(value) &&
    isOneOf(TRAINABLE_UNIT_KINDS, field(value, 'unitKind')) &&
    isOneOf(BUILDING_TYPES, field(value, 'producer')) &&
    isResourceCost(field(value, 'cost')) &&
    isPositiveInteger(field(value, 'trainingTicks')) &&
    isPositiveInteger(field(value, 'supply')) &&
    isOptionalCastleTier(field(value, 'minimumCastleTier'))
  )
}

function isResearchCatalogEntry(value: unknown): value is ResearchCatalogEntry {
  return (
    isRecord(value) &&
    isOneOf(RESEARCH_TYPES, field(value, 'researchType')) &&
    isResourceCost(field(value, 'cost')) &&
    isPositiveInteger(field(value, 'researchTicks')) &&
    isOptionalCastleTier(field(value, 'minimumCastleTier'))
  )
}

function isCastleTier(value: unknown): value is CastleTier {
  return value === 1 || value === 2 || value === 3
}

function isOptionalCastleTier(value: unknown): boolean {
  return value === undefined || isCastleTier(value)
}

/** Type guard for server-provided match configuration at the browser boundary. */
export function isMatchConfig(value: unknown): value is MatchConfig {
  if (!isRecord(value)) {
    return false
  }
  const scenarios = field(value, 'scenarios')
  const buildings = field(value, 'buildings')
  const production = field(value, 'production')
  const research = field(value, 'research')
  return (
    field(value, 'type') === 'match_config' &&
    field(value, 'protocolVersion') === PROTOCOL_VERSION &&
    isNonEmptyString(field(value, 'resumeToken')) &&
    isScenarioSummary(field(value, 'scenario')) &&
    Array.isArray(scenarios) &&
    scenarios.every(isScenarioSummary) &&
    normalizeMapDefinition(field(value, 'map')).ok &&
    Array.isArray(buildings) &&
    buildings.every(isBuildCatalogEntry) &&
    Array.isArray(production) &&
    production.every(isProductionCatalogEntry) &&
    Array.isArray(research) &&
    research.every(isResearchCatalogEntry)
  )
}
