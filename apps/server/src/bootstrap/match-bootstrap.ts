import { randomUUID } from 'node:crypto'
import { createCompetitiveMap } from '@rts/game-data'
import { type ErrorMessage, type MatchConfig, type MatchRequest, PROTOCOL_VERSION } from '@rts/protocol'
import { normalizeMapDefinition } from '@rts/shared'
import { createDemoSession } from '../content/demo/demo-session.js'
import { DEMO_SCENARIOS, DEMO_SEED, scenarioById } from '../content/demo/scenarios.js'
import type { GameSession } from '../sessions/session.js'
import { BUILDINGS, PRODUCTION, RESEARCH, SCENARIOS } from './catalog.js'
import { mapIdentity } from './identity.js'
import { assertScenarioFitsMap } from './map-validation.js'

export { SCENARIOS } from './catalog.js'

export interface AuthoritativeMatch {
  readonly session: GameSession
  readonly config: MatchConfig
}

function createResumeToken(): string {
  return randomUUID()
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
  if (normalized.ok === false) {
    throw new Error(`invalid map: ${normalized.errors.join(', ')}`)
  }
  assertScenarioFitsMap(scenarioById(scenario.id), normalized.map)
  const identity = mapIdentity(normalized.map)
  return {
    session: createDemoSession(scenario.id, request.aggression, normalized.map, identity),
    config: {
      type: 'match_config',
      protocolVersion: PROTOCOL_VERSION,
      resumeToken: createResumeToken(),
      scenario: { id: scenario.id, label: scenario.label },
      scenarios: SCENARIOS,
      map: normalized.map,
      buildings: BUILDINGS,
      production: PRODUCTION,
      research: RESEARCH
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
