import { BUILDING_TYPES, type BuildingType, type MapDefinition, normalizeMapDefinition } from '@rts/shared'

export type MatchAggression = 'offensive' | 'passive'

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
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

export function isMatchRequest(value: unknown): value is MatchRequest {
  if (
    !isRecord(value) ||
    value.type !== 'match_request' ||
    typeof value.scenarioId !== 'string' ||
    value.scenarioId.length === 0 ||
    (value.aggression !== 'offensive' && value.aggression !== 'passive') ||
    !isRecord(value.map)
  ) {
    return false
  }
  if (value.map.source === 'catalog') {
    return Object.keys(value.map).length === 1
  }
  return value.map.source === 'local' && normalizeMapDefinition(value.map.definition).ok
}

export function isScenarioSummary(value: unknown): value is ScenarioSummary {
  return isRecord(value) && typeof value.id === 'string' && value.id.length > 0 && typeof value.label === 'string'
}

function isBuildCatalogEntry(value: unknown): value is BuildCatalogEntry {
  if (
    !isRecord(value) ||
    !BUILDING_TYPES.includes(value.type as BuildingType) ||
    typeof value.label !== 'string' ||
    !isPositiveInteger(value.costMinerals) ||
    !isPositiveInteger(value.constructionTicks) ||
    !isRecord(value.footprint)
  ) {
    return false
  }
  return isPositiveInteger(value.footprint.width) && isPositiveInteger(value.footprint.height)
}

/** Type guard for server-provided match configuration at the browser boundary. */
export function isMatchConfig(value: unknown): value is MatchConfig {
  return (
    isRecord(value) &&
    value.type === 'match_config' &&
    isScenarioSummary(value.scenario) &&
    Array.isArray(value.scenarios) &&
    value.scenarios.every(isScenarioSummary) &&
    normalizeMapDefinition(value.map).ok &&
    Array.isArray(value.buildings) &&
    value.buildings.every(isBuildCatalogEntry)
  )
}
