import { createCompetitiveMap } from '@rts/game-data'
import type { MatchAggression, MatchRequest } from '@rts/protocol'
import { type MapDefinition, normalizeMapDefinition } from '@rts/shared'
import { mapIdentity } from './identity.js'

/**
 * Canonical fingerprint of every request field that determines a match
 * session. The server stores it with the runtime and requires an exact match
 * before resuming a token, so a scenario/aggression/map change can never
 * silently attach to the wrong runtime.
 */
export function matchConfigurationFingerprint(
  scenarioId: string,
  aggression: MatchAggression,
  map: MapDefinition
): string {
  const identity = mapIdentity(map)
  return JSON.stringify({
    scenarioId,
    aggression,
    mapId: identity.mapId,
    mapHash: identity.mapHash
  })
}

/** Fingerprint of an incoming match request, normalizing a local map like bootstrap does. */
export function requestConfigurationFingerprint(request: MatchRequest): string {
  const candidateMap = request.map.source === 'catalog' ? createCompetitiveMap() : request.map.definition
  const normalized = normalizeMapDefinition(candidateMap)
  if (normalized.ok === false) {
    throw new Error(`invalid map: ${normalized.errors.join(', ')}`)
  }
  return matchConfigurationFingerprint(request.scenarioId, request.aggression, normalized.map)
}
