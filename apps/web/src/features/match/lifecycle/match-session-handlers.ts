import type { ErrorMessage, MatchConfig, SnapshotMessage } from '@rts/protocol'
import type { MatchResult } from '@rts/shared'
import type { ConnectionHandlers } from '../../../shared/transport/connection'
import { snapshotToFrame } from '../projections/snapshot-to-frame'
import { projectSnapshotUnit } from '../projections/snapshot-unit'
import type { SelectionUnitState } from '../selection/selection-projection'
import type { HudMineral } from '../ui/types'
import type { MatchSessionRuntime } from './match-session-runtime'

const HUMAN_PLAYER = 0

function unitForHud(unit: SnapshotMessage['units'][number]): SelectionUnitState {
  return projectSnapshotUnit(unit)
}

function resourcesForHuman(message: SnapshotMessage) {
  const player = message.players.find((candidate) => candidate.id === HUMAN_PLAYER)
  return player === undefined ? null : { mineral: player.gold, supply: player.usedSupply, supplyCap: player.supplyCap }
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
  readonly setSelectedMineral: (mineral: HudMineral | null) => void
  readonly setMatchResult: (result: MatchResult) => void
  readonly present: (frame: ReturnType<typeof snapshotToFrame>) => void
  readonly onMatchConfig: (config: MatchConfig) => void
  readonly setScenarios: (scenarios: readonly MatchConfig['scenarios'][number][]) => void
}

function applySnapshotRuntime(runtime: MatchSessionRuntime, message: SnapshotMessage): void {
  runtime.lastTick = message.tick
  runtime.buildings = message.buildings
  runtime.mineralNodes = message.mineralNodes
  runtime.prevFramePositions = new Map(runtime.unitPositions)
  runtime.unitPositions.clear()
  runtime.unitStates.clear()
  for (const unit of message.units) {
    runtime.unitStates.set(unit.id, unitForHud(unit))
    runtime.unitPositions.set(unit.id, { x: unit.x, y: unit.y })
  }
}

function logSnapshotEvents(
  events: SnapshotMessage['events'],
  appendLog: MatchSessionHandlerOptions['appendLog']
): void {
  for (const event of events) {
    if (event.type === 'attackFired') {
      appendLog('event', `attackFired: ${event.attackerId} → ${event.targetId}`)
    } else if (event.type === 'damageDealt') {
      appendLog('event', `damageDealt: ${event.targetId} -${event.amount} HP (${event.targetHp} left)`)
    } else if (event.type === 'unitDied') {
      appendLog('event', `unitDied: ${event.entityId} (P${event.owner}) killed by ${event.killerId ?? 'unknown'}`)
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
  applySnapshotRuntime(runtime, message)
  if (runtime.selectedConstructionId !== null) {
    options.updateConstructionSelection(runtime.selectedConstructionId)
  }
  if (runtime.selectedMineralId !== null) {
    const node = runtime.mineralNodes.find((candidate) => candidate.id === runtime.selectedMineralId)
    if (node === undefined) {
      runtime.selectedMineralId = null
      options.setSelectedMineral(null)
    } else {
      options.setSelectedMineral({ id: node.id, remaining: node.remaining })
    }
  }
  options.setTick(message.tick)
  options.setUnitCount(message.units.length)
  options.setResources(resourcesForHuman(message))
  logSnapshotEvents(message.events, options.appendLog)
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
      options.setStatus('error')
      options.appendLog('error', error.message)
      if (error.scenarios !== undefined) {
        options.setScenarios(error.scenarios)
      }
    }
  }
}
