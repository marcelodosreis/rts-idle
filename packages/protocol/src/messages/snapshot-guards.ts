import {
  field,
  isInteger,
  isNonNegativeInteger,
  isOneOf,
  isOptionalNonNegativeInteger,
  isPlayerId,
  isRecord,
  RESEARCH_TYPES
} from '@rts/shared'
import type { SnapshotPlayer } from './snapshot.js'

export function isSnapshotPlayer(value: unknown): value is SnapshotPlayer {
  if (!isRecord(value)) {
    return false
  }
  const highestTier = field(value, 'highestCastleTierReached')
  const completedResearch = field(value, 'completedResearch')
  const queuedResearch = field(value, 'queuedResearch')
  return (
    isInteger(field(value, 'id')) &&
    isPlayerId(field(value, 'id')) &&
    typeof field(value, 'defeated') === 'boolean' &&
    isInteger(field(value, 'gold')) &&
    isNonNegativeInteger(field(value, 'usedSupply')) &&
    isOptionalNonNegativeInteger(field(value, 'reservedSupply')) &&
    isNonNegativeInteger(field(value, 'supplyCap')) &&
    (highestTier === undefined || (isInteger(highestTier) && highestTier >= 1 && highestTier <= 3)) &&
    (completedResearch === undefined ||
      (Array.isArray(completedResearch) &&
        completedResearch.every((item: unknown) => isOneOf(RESEARCH_TYPES, item)))) &&
    (queuedResearch === undefined ||
      (Array.isArray(queuedResearch) && queuedResearch.every((item: unknown) => isOneOf(RESEARCH_TYPES, item)))) &&
    (field(value, 'supplyCap') as number) <= 200
  )
}
