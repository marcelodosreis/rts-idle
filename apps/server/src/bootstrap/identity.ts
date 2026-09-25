import type { MapDefinition } from '@rts/shared'
import { createRulesIdentity, type RulesIdentity } from '@rts/simulation'

export function mapIdentity(map: MapDefinition): RulesIdentity {
  // The normalized map is immutable at the session boundary; canonical JSON
  // prevents distinct local maps from sharing an identity.
  const mapHash = JSON.stringify(map)
  return createRulesIdentity('demo-parallel-economy-v1', { mapId: 'match-map', mapHash })
}
