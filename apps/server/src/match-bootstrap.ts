import { BUILDING_DEFINITIONS, createCompetitiveMap } from '@rts/game-data'
import type { BuildCatalogEntry, ErrorMessage, MatchConfig, MatchRequest, ScenarioSummary } from '@rts/protocol'
import {
  isBuildableTile,
  type MapDefinition,
  normalizeMapDefinition,
  placementBoundsFromMap,
  tileAtPosition
} from '@rts/shared'
import { createRulesIdentity, type RulesIdentity } from '@rts/simulation'
import { DEMO_SCENARIOS, DEMO_SEED, type DemoScenario, scenarioById } from './demo/scenarios.js'
import { createDemoSession } from './demo.js'
import type { GameSession } from './sessions/session.js'

const BUILDINGS: readonly BuildCatalogEntry[] = Object.values(BUILDING_DEFINITIONS).map((definition) => ({
  type: definition.type,
  label: definition.label,
  footprint: { ...definition.footprint },
  costMinerals: definition.costMinerals,
  constructionTicks: definition.constructionTicks
}))
export const SCENARIOS: readonly ScenarioSummary[] = DEMO_SCENARIOS.map(({ id, label }) => ({ id, label }))

function mapIdentity(map: MapDefinition): RulesIdentity {
  // The normalized map is immutable at the session boundary; its canonical JSON
  // is enough to keep distinct local maps from sharing an identity.
  const mapHash = JSON.stringify(map)
  return createRulesIdentity('demo-parallel-economy-v1', { mapId: 'match-map', mapHash })
}

function assertScenarioFitsMap(scenario: DemoScenario, map: MapDefinition): void {
  const bounds = placementBoundsFromMap(map)
  const assertBuildable = (x: number, y: number, label: string): void => {
    const tile = tileAtPosition(map, Math.floor(x / 256), Math.floor(y / 256))
    if (tile === null || !isBuildableTile(tile)) {
      throw new Error(`${label} is outside or on invalid terrain`)
    }
  }
  for (const spawn of scenario.spawns) {
    assertBuildable(spawn.x, spawn.y, 'scenario spawn')
  }
  for (const node of scenario.mineralNodes ?? []) {
    assertBuildable(node.x, node.y, 'mineral node')
  }
  for (const base of scenario.buildings ?? []) {
    const x = base.x / 256
    const y = base.y / 256
    const footprint = BUILDING_DEFINITIONS.BASE.footprint
    const placement = { x, y, width: footprint.width, height: footprint.height }
    // Initial bases do not overlap in the supplied scenarios; this checks the
    // same terrain/bounds geometry used by simulation construction.
    for (let row = y; row < y + footprint.height; row += 1) {
      for (let col = x; col < x + footprint.width; col += 1) {
        if (
          col < 0 ||
          row < 0 ||
          col >= bounds.width ||
          row >= bounds.height ||
          !isBuildableTile(tileAtPosition(map, col, row)!)
        ) {
          throw new Error('scenario base is outside or on invalid terrain')
        }
      }
    }
    void placement
  }
}

export interface AuthoritativeMatch {
  readonly session: GameSession
  readonly config: MatchConfig
}

export type MatchBootstrapResult = { readonly match: AuthoritativeMatch } | { readonly error: ErrorMessage }

/** Validates external map input and creates the first mutable match state. */
export function createAuthoritativeMatch(request: MatchRequest): AuthoritativeMatch {
  const scenario = DEMO_SCENARIOS.find((candidate) => candidate.id === request.scenarioId)
  if (scenario === undefined) {
    throw new Error(`unknown scenario: ${request.scenarioId}`)
  }
  const candidateMap = request.map.source === 'catalog' ? createCompetitiveMap() : request.map.definition
  const normalized = normalizeMapDefinition(candidateMap)
  if (!normalized.ok) {
    throw new Error(`invalid map: ${normalized.errors.join(', ')}`)
  }
  assertScenarioFitsMap(scenarioById(scenario.id), normalized.map)
  const identity = mapIdentity(normalized.map)
  return {
    session: createDemoSession(scenario.id, request.aggression, normalized.map, identity),
    config: {
      type: 'match_config',
      scenario: { id: scenario.id, label: scenario.label },
      scenarios: SCENARIOS,
      map: normalized.map,
      buildings: BUILDINGS
    }
  }
}

/** Creates a match or returns the bootstrap failure with the server-owned scenario catalog. */
export function bootstrapMatch(request: MatchRequest): MatchBootstrapResult {
  try {
    return { match: createAuthoritativeMatch(request) }
  } catch (error) {
    return {
      error: {
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
        scenarios: SCENARIOS
      }
    }
  }
}

export { DEMO_SEED }
