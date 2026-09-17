import type { RulesIdentity } from './simulation.js'
import { SIMULATION_VERSION } from './simulation-version.js'

/**
 * Builds a RulesIdentity from a short environment tag.
 *
 * The four versioned fields (ruleset, map, hashes) share a single tag in
 * fixtures, demos, benchmarks, and tests; `overrides` allows a specific field
 * to differ (e.g. a map with a distinct hash) without repeating the shape.
 */
export function createRulesIdentity(
  tag: string,
  overrides: Partial<Omit<RulesIdentity, 'simulationVersion'>> = {}
): RulesIdentity {
  return {
    simulationVersion: SIMULATION_VERSION,
    rulesetVersion: tag,
    rulesetHash: tag,
    mapId: tag,
    mapHash: tag,
    ...overrides
  }
}
