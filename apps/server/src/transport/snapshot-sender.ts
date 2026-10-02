import type { ErrorMessage, SnapshotDeltaMessage, SnapshotMessage } from '@rts/protocol'
import type { SimulationEvent } from '@rts/shared'
import { WorldChangeCursorExpiredError } from '@rts/simulation'
import type { GameSession } from '../sessions/session.js'

export interface SnapshotSocket {
  readonly OPEN: number
  readonly readyState: number
  send(data: string): void
}

interface EntityDelta {
  readonly cursor: number
  readonly units: SnapshotMessage['units']
  readonly buildings: SnapshotMessage['buildings']
  readonly resources: SnapshotMessage['resources']
  readonly players: SnapshotMessage['players']
  readonly removedUnitIds: readonly number[]
  readonly removedBuildingIds: readonly number[]
}

export class SnapshotSender {
  private static readonly DELTAS_PER_FULL_SNAPSHOT = 39
  private cursor: number | null = null
  private lastSentTick: number | null = null
  private nextViewSequence = 1
  private lastSentViewSequence: number | null = null
  private lastSentViewHash: string | null = null
  private deltasSinceFull = 0
  private readonly unitIds = new Set<number>()
  private readonly buildingIds = new Set<number>()
  constructor(private readonly ws: SnapshotSocket) {}

  sendError(message: string): void {
    this.sendErrorMessage({ type: 'error', message })
  }

  sendErrorMessage(error: ErrorMessage): void {
    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.send(JSON.stringify(error))
    }
  }

  sendSnapshot(session: GameSession, events: readonly SimulationEvent[]): void {
    if (this.ws.readyState !== this.ws.OPEN) {
      return
    }
    const message = this.nextMessage(session, events)
    this.ws.send(JSON.stringify(message))
  }

  reset(): void {
    this.cursor = null
    this.lastSentTick = null
    this.lastSentViewSequence = null
    this.lastSentViewHash = null
    this.deltasSinceFull = 0
    this.unitIds.clear()
    this.buildingIds.clear()
  }

  private fullMessage(session: GameSession, events: readonly SimulationEvent[]): SnapshotMessage {
    const observation = session.observe(true)
    this.cursor = session.changeCursor()
    this.lastSentTick = session.tick()
    const viewSequence = this.nextViewSequence
    this.nextViewSequence += 1
    const viewHash = session.hashState()
    this.lastSentViewSequence = viewSequence
    this.lastSentViewHash = viewHash
    this.deltasSinceFull = 0
    this.unitIds.clear()
    this.buildingIds.clear()
    for (const unit of observation.units) {
      this.unitIds.add(unit.id)
    }
    for (const building of observation.buildings) {
      this.buildingIds.add(building.id)
    }
    return {
      type: 'snapshot',
      tick: session.tick(),
      viewSequence,
      viewHash,
      phase: session.phase(),
      units: observation.units,
      buildings: observation.buildings,
      resources: observation.resources,
      resourcesComplete: true,
      players: observation.players,
      events
    }
  }

  private deltaMessage(session: GameSession, events: readonly SimulationEvent[]): SnapshotDeltaMessage {
    const cursor = this.cursor
    if (
      cursor === null ||
      this.lastSentTick === null ||
      this.lastSentViewSequence === null ||
      this.lastSentViewHash === null
    ) {
      throw new Error('SnapshotSender: delta requested before full snapshot')
    }
    const baseTick = this.lastSentTick
    const baseSequence = this.lastSentViewSequence
    const baseHash = this.lastSentViewHash
    const entityDelta = collectEntityDelta(session, cursor, this.unitIds, this.buildingIds)
    this.cursor = entityDelta.cursor
    this.lastSentTick = session.tick()
    const viewSequence = this.nextViewSequence
    this.nextViewSequence += 1
    const viewHash = session.hashState()
    this.lastSentViewSequence = viewSequence
    this.lastSentViewHash = viewHash
    this.deltasSinceFull += 1
    return {
      type: 'snapshot_delta',
      baseTick,
      baseSequence,
      baseHash,
      tick: session.tick(),
      viewSequence,
      viewHash,
      phase: session.phase(),
      units: entityDelta.units,
      removedUnitIds: entityDelta.removedUnitIds,
      buildings: entityDelta.buildings,
      removedBuildingIds: entityDelta.removedBuildingIds,
      resources: entityDelta.resources,
      resourcesComplete: false,
      // There are four fixed player slots; sending these small projections is
      // cheaper and safer than maintaining a second mutable player journal.
      players: entityDelta.players,
      events
    }
  }

  sendMatchConfig(config: object): void {
    this.ws.send(JSON.stringify(config))
  }

  private nextMessage(
    session: GameSession,
    events: readonly SimulationEvent[]
  ): SnapshotMessage | SnapshotDeltaMessage {
    if (this.cursor === null || this.deltasSinceFull >= SnapshotSender.DELTAS_PER_FULL_SNAPSHOT) {
      return this.fullMessage(session, events)
    }
    try {
      return this.deltaMessage(session, events)
    } catch (error) {
      if (error instanceof WorldChangeCursorExpiredError) {
        return this.fullMessage(session, events)
      }
      throw error
    }
  }
}

function collectEntityDelta(
  session: GameSession,
  cursor: number,
  unitIds: Set<number>,
  buildingIds: Set<number>
): EntityDelta {
  const changes = session.changesSince(cursor)
  const changedIds = [...changes.createdIds, ...changes.dirtyIds]
  const observation = session.observe(false, changedIds)
  const observedUnitIds = new Set(observation.units.map((unit) => unit.id))
  const observedBuildingIds = new Set(observation.buildings.map((building) => building.id))
  const removedIds = new Set(changes.removedIds)
  const removedUnitIds = removedEntityIds(changes.removedIds, changedIds, removedIds, observedUnitIds, unitIds)
  const removedBuildingIds = removedEntityIds(
    changes.removedIds,
    changedIds,
    removedIds,
    observedBuildingIds,
    buildingIds
  )
  for (const id of removedUnitIds) {
    unitIds.delete(id)
  }
  for (const id of removedBuildingIds) {
    buildingIds.delete(id)
  }
  updateKnownEntityIds(unitIds, buildingIds, observation.units, observation.buildings)
  return {
    cursor: changes.cursor,
    units: observation.units,
    buildings: observation.buildings,
    resources: observation.resources,
    players: observation.players,
    removedUnitIds,
    removedBuildingIds
  }
}

function updateKnownEntityIds(
  unitIds: Set<number>,
  buildingIds: Set<number>,
  units: SnapshotMessage['units'],
  buildings: SnapshotMessage['buildings']
): void {
  for (const unit of units) {
    unitIds.add(unit.id)
    buildingIds.delete(unit.id)
  }
  for (const building of buildings) {
    buildingIds.add(building.id)
    unitIds.delete(building.id)
  }
}

function removedEntityIds(
  removedIds: readonly number[],
  changedIds: readonly number[],
  removedIdSet: ReadonlySet<number>,
  observedIds: ReadonlySet<number>,
  knownIds: ReadonlySet<number>
): readonly number[] {
  const result = removedIds.filter((id) => knownIds.has(id))
  for (const id of changedIds) {
    if (!removedIdSet.has(id) && knownIds.has(id) && !observedIds.has(id)) {
      result.push(id)
    }
  }
  return result.sort((first, second) => first - second)
}
