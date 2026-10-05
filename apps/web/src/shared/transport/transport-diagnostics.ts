import type { SnapshotDeltaMessage, SnapshotMessage } from '@rts/protocol'
import type { TransportBaselineTrace, TransportDebug, TransportMessageTrace } from './transport-types'

export interface TransportDiagnostics {
  readonly debug: TransportDebug
  setConnectionState(state: 'connecting' | 'open' | 'closed'): void
  setResumeToken(token: string): void
  clearResumeToken(): void
  recordSnapshot(message: SnapshotMessage): void
  recordDelta(message: SnapshotDeltaMessage): boolean
  acceptBaseline(message: SnapshotMessage | SnapshotDeltaMessage): void
  recordResyncRequest(): void
}

function snapshotTrace(message: SnapshotMessage, dropped: boolean): TransportMessageTrace {
  return {
    type: 'snapshot',
    tick: message.tick,
    viewSequence: message.viewSequence,
    viewHash: message.viewHash,
    unitCount: message.units.length,
    buildingCount: message.buildings.length,
    resourceCount: message.resources.length,
    playerCount: message.players.length,
    resourcesComplete: message.resourcesComplete,
    dropped
  }
}

function deltaTrace(message: SnapshotDeltaMessage, dropped: boolean): TransportMessageTrace {
  return {
    type: 'snapshot_delta',
    tick: message.tick,
    viewSequence: message.viewSequence,
    viewHash: message.viewHash,
    baseSequence: message.baseSequence,
    unitCount: message.units.length,
    buildingCount: message.buildings.length,
    resourceCount: message.resources.length,
    playerCount: message.players.length,
    resourcesComplete: message.resourcesComplete,
    dropped
  }
}

function baselineTrace(message: SnapshotMessage | SnapshotDeltaMessage): TransportBaselineTrace {
  return { tick: message.tick, viewSequence: message.viewSequence, viewHash: message.viewHash }
}

export function createTransportDiagnostics(
  enabled: boolean,
  close: () => void,
  reconnect: () => void,
  initialToken: string | undefined
): TransportDiagnostics {
  let connectionState: 'connecting' | 'open' | 'closed' = 'connecting'
  let resumeToken: string | null = initialToken ?? null
  let skipNextDelta = false
  let resyncRequests = 0
  let droppedDeltas = 0
  let acceptedBaseline: TransportBaselineTrace | null = null
  const messages: TransportMessageTrace[] = []
  const debug: TransportDebug = {
    disconnect: close,
    reconnect,
    dropNextDelta: () => {
      skipNextDelta = true
    },
    getState: () => ({
      connectionState,
      resumeToken,
      messages: [...messages],
      acceptedBaseline,
      resyncRequests,
      droppedDeltas
    })
  }
  return {
    debug,
    setConnectionState: (state) => {
      connectionState = state
    },
    setResumeToken: (token) => {
      resumeToken = token
    },
    clearResumeToken: () => {
      resumeToken = null
    },
    recordSnapshot: (message) => {
      if (enabled) {
        messages.push(snapshotTrace(message, false))
        acceptedBaseline = baselineTrace(message)
      }
    },
    recordDelta: (message) => {
      if (!enabled) {
        return false
      }
      const dropped = skipNextDelta
      skipNextDelta = false
      if (dropped) {
        droppedDeltas += 1
      }
      messages.push(deltaTrace(message, dropped))
      return dropped
    },
    acceptBaseline: (message) => {
      if (enabled) {
        acceptedBaseline = baselineTrace(message)
      }
    },
    recordResyncRequest: () => {
      resyncRequests += 1
    }
  }
}
