import type { ErrorMessage, SnapshotDeltaMessage, SnapshotMessage } from '@rts/protocol'
import type { PlayerId, SimulationEvent } from '@rts/shared'
import { hashObservation, WorldChangeCursorExpiredError } from '@rts/simulation'
import type { GameSession } from '../sessions/session.js'

export interface SnapshotSocket {
  readonly OPEN: number
  readonly readyState: number
  send(data: string): void
}

interface EntityDelta {
  readonly cursor: number
  readonly observation: ReturnType<GameSession['observeForPlayer']>
  readonly units: SnapshotMessage['units']
  readonly buildings: SnapshotMessage['buildings']
  readonly projectiles: SnapshotMessage['projectiles']
  readonly resources: SnapshotMessage['resources']
  readonly players: SnapshotMessage['players']
  readonly removedUnitIds: readonly number[]
  readonly removedBuildingIds: readonly number[]
  readonly removedProjectileIds: readonly number[]
}

interface EntityDeltaInput {
  readonly session: GameSession
  readonly playerId: PlayerId
  readonly cursor: number
  readonly unitIds: Set<number>
  readonly buildingIds: Set<number>
  readonly projectileIds: Set<number>
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
  private readonly projectileIds = new Set<number>()
  private readonly resourceAmounts = new Map<number, number>()
  constructor(
    private readonly ws: SnapshotSocket,
    private readonly playerId: PlayerId = 0
  ) {}

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
    this.projectileIds.clear()
    this.resourceAmounts.clear()
  }

  private fullMessage(session: GameSession, events: readonly SimulationEvent[]): SnapshotMessage {
    const observation = session.observeForPlayer(this.playerId, true)
    this.cursor = session.changeCursor()
    this.lastSentTick = session.tick()
    const viewSequence = this.nextViewSequence
    this.nextViewSequence += 1
    const viewHash = hashObservation(observation)
    this.lastSentViewSequence = viewSequence
    this.lastSentViewHash = viewHash
    this.deltasSinceFull = 0
    this.unitIds.clear()
    this.buildingIds.clear()
    this.projectileIds.clear()
    for (const unit of observation.units) {
      this.unitIds.add(unit.id)
    }
    for (const building of observation.buildings) {
      this.buildingIds.add(building.id)
    }
    for (const projectile of observation.projectiles) {
      this.projectileIds.add(projectile.id)
    }
    this.resourceAmounts.clear()
    for (const resource of observation.resources) {
      this.resourceAmounts.set(resource.resourceId, resource.remaining)
    }
    return {
      type: 'snapshot',
      tick: session.tick(),
      viewSequence,
      viewHash,
      phase: session.phase(),
      units: observation.units,
      buildings: observation.buildings,
      projectiles: observation.projectiles,
      resources: observation.resources,
      resourcesComplete: true,
      players: observation.players,
      events: session.filterEventsForPlayer(this.playerId, events),
      fog: observation.fog
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
    const entityDelta = collectEntityDelta({
      session,
      playerId: this.playerId,
      cursor,
      unitIds: this.unitIds,
      buildingIds: this.buildingIds,
      projectileIds: this.projectileIds
    })
    this.cursor = entityDelta.cursor
    this.lastSentTick = session.tick()
    const viewSequence = this.nextViewSequence
    this.nextViewSequence += 1
    const fullObservation = session.observeForPlayer(this.playerId, true)
    const viewHash = hashObservation(fullObservation)
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
      projectiles: entityDelta.projectiles,
      removedProjectileIds: entityDelta.removedProjectileIds,
      resources: changedResources(fullObservation.resources, this.resourceAmounts),
      resourcesComplete: false,
      // There are four fixed player slots; sending these small projections is
      // cheaper and safer than maintaining a second mutable player journal.
      players: entityDelta.players,
      events: session.filterEventsForPlayer(this.playerId, events),
      fog: entityDelta.observation.fog
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

function collectEntityDelta(input: EntityDeltaInput): EntityDelta {
  const { session, playerId, cursor, unitIds, buildingIds, projectileIds } = input
  const changes = session.changesSince(cursor)
  const changedIds = [...changes.createdIds, ...changes.dirtyIds]
  const observation = session.observeForPlayer(playerId, false, changedIds)
  const visible = session.observeForPlayer(playerId, false)
  const observedUnitIds = new Set(visible.units.map((unit) => unit.id))
  const observedBuildingIds = new Set(visible.buildings.map((building) => building.id))
  const removedUnitIds = removedEntityIds(unitIds, observedUnitIds)
  const removedBuildingIds = removedEntityIds(buildingIds, observedBuildingIds)
  const observedProjectileIds = new Set(visible.projectiles.map((projectile) => projectile.id))
  const removedProjectileIds = removedEntityIds(projectileIds, observedProjectileIds)
  const units = includeNewEntities(observation.units, visible.units, unitIds)
  const buildings = includeNewEntities(observation.buildings, visible.buildings, buildingIds)
  for (const id of removedUnitIds) {
    unitIds.delete(id)
  }
  for (const id of removedBuildingIds) {
    buildingIds.delete(id)
  }
  for (const id of removedProjectileIds) {
    projectileIds.delete(id)
  }
  for (const projectile of visible.projectiles) {
    projectileIds.add(projectile.id)
  }
  updateKnownEntityIds(unitIds, buildingIds, units, buildings)
  return {
    cursor: changes.cursor,
    observation: visible,
    units,
    buildings,
    projectiles: visible.projectiles,
    resources: observation.resources,
    players: visible.players,
    removedUnitIds,
    removedBuildingIds,
    removedProjectileIds
  }
}

function includeNewEntities<T extends { readonly id: number }>(
  changed: readonly T[],
  visible: readonly T[],
  knownIds: ReadonlySet<number>
): readonly T[] {
  const byId = new Map(changed.map((entity) => [entity.id, entity]))
  for (const entity of visible) {
    if (!knownIds.has(entity.id)) {
      byId.set(entity.id, entity)
    }
  }
  return [...byId.values()].sort((left, right) => left.id - right.id)
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

function changedResources(
  resources: SnapshotMessage['resources'],
  knownAmounts: Map<number, number>
): SnapshotMessage['resources'] {
  const changed = resources.filter((resource) => knownAmounts.get(resource.resourceId) !== resource.remaining)
  for (const resource of resources) {
    knownAmounts.set(resource.resourceId, resource.remaining)
  }
  return changed
}

function removedEntityIds(knownIds: ReadonlySet<number>, observedIds: ReadonlySet<number>): readonly number[] {
  return [...knownIds].filter((id) => !observedIds.has(id)).sort((first, second) => first - second)
}
