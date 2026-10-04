import type { BuildCatalogEntry, ErrorMessage, MatchConfig, SnapshotDeltaMessage, SnapshotMessage } from '@rts/protocol'
import type { MatchResult } from '@rts/shared'
import type { ConnectionHandlers } from '../../../shared/transport/connection'
import { type HudNotification, matchErrorNotification } from '../lib/hud-notifications'
import type { SelectionUnitState } from '../lib/selection-projection'
import { snapshotToFrame } from '../lib/snapshot-to-frame'
import { projectSnapshotUnit } from '../lib/snapshot-unit'
import type { HudResource } from '../types/hud-types'
import { hudResourceFor, type MatchSessionRuntime } from './match-session-runtime'

const HUMAN_PLAYER = 0

function unitForHud(unit: SnapshotMessage['units'][number]): SelectionUnitState {
  return projectSnapshotUnit(unit)
}

function currentUpgradeTier(message: SnapshotMessage, buildCatalog: readonly BuildCatalogEntry[]): number {
  const upgradeableTypes = new Set(
    buildCatalog.filter((entry) => entry.capabilities?.canUpgrade === true).map((entry) => entry.type)
  )
  const useTierFallback = buildCatalog.length === 0
  let tier = 1
  for (const building of message.buildings) {
    if (building.owner !== HUMAN_PLAYER || building.status !== 'COMPLETED') {
      continue
    }
    if (!useTierFallback && !upgradeableTypes.has(building.buildingType)) {
      continue
    }
    if (useTierFallback && building.tier === undefined) {
      continue
    }
    tier = Math.max(tier, building.tier ?? 1)
  }
  return tier
}

function resourcesForHuman(message: SnapshotMessage, buildCatalog: readonly BuildCatalogEntry[]) {
  const player = message.players.find((candidate) => candidate.id === HUMAN_PLAYER)
  return player === undefined
    ? null
    : {
        resources: { ...player.resources },
        supply: player.usedSupply,
        reservedSupply: player.reservedSupply ?? 0,
        supplyCap: player.supplyCap,
        castleTier: currentUpgradeTier(message, buildCatalog),
        completedResearch: [...(player.completedResearch ?? [])],
        queuedResearch: [...(player.queuedResearch ?? [])]
      }
}

export interface MatchSessionHandlerOptions {
  readonly runtime: MatchSessionRuntime
  readonly clearCommandMode: () => void
  readonly appendLog: (kind: 'command' | 'event' | 'info' | 'error', message: string) => void
  readonly cancelPlacement: () => void
  readonly updateConstructionSelection: (id: number) => void
  readonly updateSelection: (ids: readonly number[]) => void
  readonly setStatus: (status: string) => void
  readonly setTick: (tick: number) => void
  readonly setUnitCount: (count: number) => void
  readonly setResources: (resources: ReturnType<typeof resourcesForHuman>) => void
  readonly appendCompletedConstructions: (buildings: readonly SnapshotMessage['buildings'][number][]) => void
  readonly setHudNotification: (notification: HudNotification | null) => void
  readonly setSelectedResource: (resource: HudResource | null) => void
  readonly setMatchResult: (result: MatchResult) => void
  readonly present: (frame: ReturnType<typeof snapshotToFrame>) => void
  readonly onMatchConfig: (config: MatchConfig) => void
  readonly setScenarios: (scenarios: readonly MatchConfig['scenarios'][number][]) => void
}

function applySnapshotRuntime(runtime: MatchSessionRuntime, message: SnapshotMessage): void {
  runtime.snapshot = message
  runtime.lastTick = message.tick
  runtime.buildings = message.buildings
  runtime.resources = message.resources
  if (message.resourcesComplete) {
    runtime.resourceAmounts.clear()
  }
  for (const resource of message.resources) {
    runtime.resourceAmounts.set(resource.resourceId, resource.remaining)
  }
  runtime.prevFramePositions = new Map(runtime.unitPositions)
  runtime.unitPositions.clear()
  runtime.unitStates.clear()
  for (const unit of message.units) {
    runtime.unitStates.set(unit.id, unitForHud(unit))
    runtime.unitPositions.set(unit.id, { x: unit.x, y: unit.y })
  }
}

function mergeById<T extends { readonly id: number }>(
  previous: readonly T[],
  changed: readonly T[],
  removed: readonly number[]
): readonly T[] {
  const removedIds = new Set(removed)
  const changedById = new Map(changed.map((value) => [value.id, value]))
  return previous.filter((value) => !removedIds.has(value.id) && !changedById.has(value.id)).concat(changed)
}

function mergeResources(previous: SnapshotMessage['resources'], changed: SnapshotDeltaMessage['resources']) {
  const byId = new Map(previous.map((resource) => [resource.resourceId, resource.remaining]))
  for (const resource of changed) {
    byId.set(resource.resourceId, resource.remaining)
  }
  return [...byId].map(([resourceId, remaining]) => ({ resourceId, remaining }))
}

function expandSnapshotDelta(runtime: MatchSessionRuntime, delta: SnapshotDeltaMessage): SnapshotMessage | null {
  const previous = runtime.snapshot
  if (
    previous === null ||
    previous.tick !== delta.baseTick ||
    previous.viewSequence !== delta.baseSequence ||
    previous.viewHash !== delta.baseHash
  ) {
    return null
  }
  return {
    type: 'snapshot',
    tick: delta.tick,
    viewSequence: delta.viewSequence,
    viewHash: delta.viewHash,
    phase: delta.phase,
    units: mergeById(previous.units, delta.units, delta.removedUnitIds),
    buildings: mergeById(previous.buildings, delta.buildings, delta.removedBuildingIds),
    resources: mergeResources(previous.resources, delta.resources),
    resourcesComplete: false,
    players: mergeById(previous.players, delta.players, []),
    events: delta.events
  }
}

function completedHumanConstructions(
  previous: SnapshotMessage['buildings'],
  current: SnapshotMessage['buildings']
): readonly SnapshotMessage['buildings'][number][] {
  const previousById = new Map(previous.map((building) => [building.id, building]))
  return current.filter((building) => {
    const previousBuilding = previousById.get(building.id)
    return (
      building.owner === HUMAN_PLAYER &&
      building.status === 'COMPLETED' &&
      previousBuilding !== undefined &&
      previousBuilding.status !== 'COMPLETED'
    )
  })
}

function logSnapshotEvents(
  events: SnapshotMessage['events'],
  appendLog: MatchSessionHandlerOptions['appendLog'],
  setHudNotification: MatchSessionHandlerOptions['setHudNotification'],
  runtime: MatchSessionRuntime
): void {
  for (const event of events) {
    if (event.type === 'attackFired') {
      appendLog('event', `attackFired: ${event.attackerId} → ${event.targetId}`)
    } else if (event.type === 'damageDealt') {
      appendLog('event', `damageDealt: ${event.targetId} -${event.amount} HP (${event.targetHp} left)`)
    } else if (event.type === 'repairStopped') {
      appendLog('event', `repairStopped: worker ${event.workerId} target ${event.targetId} (${event.reason})`)
      if (event.reason === 'NO_GOLD' && runtime.unitStates.get(event.workerId)?.owner === HUMAN_PLAYER) {
        setHudNotification({ kind: 'REPAIR_STOPPED_NO_GOLD' })
      }
    } else if (event.type === 'unitDied') {
      appendLog('event', `unitDied: ${event.entityId} (P${event.owner}) killed by ${event.killerId ?? 'unknown'}`)
    } else if (event.type === 'movementBlocked') {
      appendLog(
        'event',
        `movementBlocked: ${event.unitId} → ${event.destinationX},${event.destinationY} (${event.reason})`
      )
      if (runtime.unitStates.get(event.unitId)?.owner === HUMAN_PLAYER) {
        setHudNotification({ kind: 'MOVEMENT_BLOCKED', reason: event.reason })
      }
    }
  }
}

function completeMatch(message: SnapshotMessage, options: MatchSessionHandlerOptions): void {
  const { runtime } = options
  if (runtime.matchEnded || message.phase !== 'FINISHED') {
    return
  }
  runtime.matchEnded = true
  options.cancelPlacement()
  options.clearCommandMode()
  const active = message.players.filter((player) => !player.defeated)
  let result: MatchResult = 'draw'
  if (active.length === 1) {
    result = active[0]!.id === HUMAN_PLAYER ? 'victory' : 'defeat'
  }
  options.appendLog('info', `Match result: ${result}`)
  options.setMatchResult(result)
}

function handleSnapshot(message: SnapshotMessage, options: MatchSessionHandlerOptions): void {
  const { runtime } = options
  runtime.snapshotReceived = true
  const completedConstructions = completedHumanConstructions(runtime.buildings, message.buildings)
  applySnapshotRuntime(runtime, message)
  if (runtime.selectedConstructionId !== null) {
    options.updateConstructionSelection(runtime.selectedConstructionId)
  }
  if (runtime.selectedResourceId !== null) {
    const resource = hudResourceFor(runtime, runtime.selectedResourceId)
    if (resource === null) {
      runtime.selectedResourceId = null
      options.setSelectedResource(null)
    } else {
      options.setSelectedResource(resource)
    }
  }
  options.setTick(message.tick)
  options.setUnitCount(message.units.length)
  options.setResources(resourcesForHuman(message, runtime.buildCatalog))
  options.appendCompletedConstructions(completedConstructions)
  logSnapshotEvents(message.events, options.appendLog, options.setHudNotification, runtime)
  completeMatch(message, options)
  options.present(snapshotToFrame(message))
  if (runtime.selectedIds.length > 0) {
    options.updateSelection(runtime.selectedIds)
  }
}

export function createMatchSessionHandlers(options: MatchSessionHandlerOptions): ConnectionHandlers {
  const { runtime } = options
  return {
    onMatchConfig: options.onMatchConfig,
    onSnapshot: (message) => {
      if (runtime.sessionActive) {
        handleSnapshot(message, options)
      }
    },
    onSnapshotDelta: (delta) => {
      if (!runtime.sessionActive) {
        return true
      }
      const message = expandSnapshotDelta(runtime, delta)
      if (message === null) {
        options.appendLog('error', `snapshot delta base mismatch at tick ${delta.tick}`)
        return false
      }
      handleSnapshot(message, options)
      return true
    },
    onOpen: () => {
      if (!runtime.sessionActive) {
        return
      }
      options.setStatus('connected')
      options.appendLog('info', 'Connected')
    },
    onError: (error: ErrorMessage) => {
      if (!runtime.sessionActive) {
        return
      }
      options.appendLog('error', error.message)
      options.setHudNotification(matchErrorNotification(error.message))
      if (error.scenarios !== undefined) {
        options.setScenarios(error.scenarios)
      }
    },
    onTransportError: (error: ErrorMessage) => {
      if (!runtime.sessionActive) {
        return
      }
      options.setStatus('error')
      options.appendLog('error', error.message)
      options.setHudNotification({ kind: 'CONNECTION_LOST' })
    },
    onClose: () => {
      if (!runtime.sessionActive) {
        return
      }
      options.setStatus('error')
      options.appendLog('error', 'Connection closed')
      options.setHudNotification({ kind: 'CONNECTION_CLOSED' })
    }
  }
}
