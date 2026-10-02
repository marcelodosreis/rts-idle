import type { EntityId, SimulationEvent } from '@rts/shared'
import { field, isInteger, isNonNegativeInteger, isOneOf, isRecord } from '@rts/shared'
import type { MatchPhase, SnapshotBuilding, SnapshotPlayer, SnapshotResource, SnapshotUnit } from './snapshot.js'
import {
  hasNoSharedEntityIds,
  hasUniqueFieldValues,
  isSimulationEvent,
  isSnapshotBuilding,
  isSnapshotResource,
  isSnapshotUnit,
  MATCH_PHASES
} from './snapshot.js'
import { isSnapshotPlayer } from './snapshot-guards.js'
import { isSnapshotViewHash, isSnapshotViewSequence } from './snapshot-metadata.js'

export interface SnapshotDeltaMessage {
  readonly type: 'snapshot_delta'
  readonly baseTick: number
  readonly baseSequence: number
  readonly baseHash: string
  readonly tick: number
  readonly viewSequence: number
  readonly viewHash: string
  readonly phase: MatchPhase
  readonly units: readonly SnapshotUnit[]
  readonly removedUnitIds: readonly EntityId[]
  readonly buildings: readonly SnapshotBuilding[]
  readonly removedBuildingIds: readonly EntityId[]
  readonly resources: readonly SnapshotResource[]
  readonly resourcesComplete: false
  readonly players: readonly SnapshotPlayer[]
  readonly events: readonly SimulationEvent[]
}

function isSnapshotDelta(value: unknown): value is SnapshotDeltaMessage {
  if (!isRecord(value)) {
    return false
  }
  const baseTick = field(value, 'baseTick')
  const baseSequence = field(value, 'baseSequence')
  const tick = field(value, 'tick')
  const viewSequence = field(value, 'viewSequence')
  const units = field(value, 'units')
  const buildings = field(value, 'buildings')
  const resources = field(value, 'resources')
  const players = field(value, 'players')
  const events = field(value, 'events')
  const removedUnitIds = field(value, 'removedUnitIds')
  const removedBuildingIds = field(value, 'removedBuildingIds')
  return (
    field(value, 'type') === 'snapshot_delta' &&
    isNonNegativeInteger(baseTick) &&
    isSnapshotViewSequence(baseSequence) &&
    isSnapshotViewHash(field(value, 'baseHash')) &&
    isNonNegativeInteger(tick) &&
    baseTick < tick &&
    isSnapshotViewSequence(viewSequence) &&
    isSnapshotViewHash(field(value, 'viewHash')) &&
    baseSequence < viewSequence &&
    isOneOf(MATCH_PHASES, field(value, 'phase')) &&
    Array.isArray(units) &&
    units.every(isSnapshotUnit) &&
    hasUniqueFieldValues(units, 'id') &&
    Array.isArray(removedUnitIds) &&
    removedUnitIds.every(isNonNegativeInteger) &&
    hasUniqueValues(removedUnitIds) &&
    hasNoSharedIds(units, removedUnitIds) &&
    Array.isArray(buildings) &&
    buildings.every(isSnapshotBuilding) &&
    hasUniqueFieldValues(buildings, 'id') &&
    hasNoSharedEntityIds(units, buildings) &&
    Array.isArray(removedBuildingIds) &&
    removedBuildingIds.every(isNonNegativeInteger) &&
    hasUniqueValues(removedBuildingIds) &&
    hasNoSharedIds(buildings, removedBuildingIds) &&
    Array.isArray(resources) &&
    resources.every(isSnapshotResource) &&
    hasUniqueFieldValues(resources, 'resourceId') &&
    field(value, 'resourcesComplete') === false &&
    Array.isArray(players) &&
    players.every(isSnapshotPlayer) &&
    hasUniqueFieldValues(players, 'id') &&
    Array.isArray(events) &&
    events.every(isSimulationEvent)
  )
}

function hasUniqueValues(values: readonly unknown[]): boolean {
  return values.every((value, index) => isInteger(value) && values.indexOf(value) === index)
}

function hasNoSharedIds(values: readonly unknown[], removedIds: readonly unknown[]): boolean {
  return values.every((value) => isRecord(value) && !removedIds.includes(field(value, 'id')))
}

export function isSnapshotDeltaMessage(value: unknown): value is SnapshotDeltaMessage {
  return isSnapshotDelta(value)
}
