import {
  type ErrorMessage,
  isErrorMessage,
  isMatchConfig,
  isSnapshotDeltaMessage,
  isSnapshotMessage,
  type MatchConfig,
  type MatchRequest,
  type SnapshotDeltaMessage,
  type SnapshotMessage
} from '@rts/protocol'
import type { CommandIntent } from '@rts/shared'
import { removeNewMatchMarker } from './match-entry-url'
import {
  clearMatchResumeState,
  clearMatchResumeToken,
  type StoredMatchSession,
  saveMatchSession
} from './resume-token.js'
import { createTransportDiagnostics, type TransportDiagnostics } from './transport-diagnostics'
import type { TransportDebug } from './transport-types'

export type {
  TransportBaselineTrace,
  TransportDebug,
  TransportDebugState,
  TransportMessageTrace
} from './transport-types'
export type { SnapshotMessage }

export interface MatchConnection {
  sendCommand(intent: CommandIntent): void
  reconnect(): void
  close(): void
}

export interface MatchConnectionOptions {
  readonly spritesEnabled?: boolean
  readonly staleResumePolicy?: 'fresh' | 'fail'
  readonly onResumeUnavailable?: () => void
}

export interface ConnectionHandlers {
  readonly onSnapshot: (message: SnapshotMessage) => void
  readonly onSnapshotDelta?: (message: SnapshotDeltaMessage) => boolean | undefined
  readonly onOpen?: () => void
  readonly onMatchConfig?: (config: MatchConfig) => void
  readonly onError?: (error: ErrorMessage) => void
  readonly onTransportError?: (error: ErrorMessage) => void
  readonly onClose?: () => void
}

declare global {
  interface Window {
    __rtsTransportDebug?: TransportDebug
  }
}

export { clearMatchResumeState, clearMatchResumeToken, startNewMatch } from './resume-token.js'

function e2eTransportHookEnabled(): boolean {
  const { DEV, VITE_E2E_TRANSPORT_HOOK } = import.meta.env
  return DEV === true && VITE_E2E_TRANSPORT_HOOK === 'true'
}

interface SnapshotBaseline {
  readonly viewSequence: number
  readonly viewHash: string
}

function resyncRequest(baseline: SnapshotBaseline | null, delta: SnapshotDeltaMessage): string {
  const current = baseline ?? delta
  return JSON.stringify({
    type: 'snapshot_resync_request',
    baseSequence: current.viewSequence,
    baseHash: current.viewHash
  })
}

interface IncomingMessageOptions {
  readonly parsed: unknown
  readonly diagnostics: TransportDiagnostics
  readonly snapshotBaseline: SnapshotBaseline | null
  readonly handlers: ConnectionHandlers
  readonly send: (payload: string) => void
  readonly onMatchConfig: (config: MatchConfig) => void
  readonly recoveryState: RecoveryState
  readonly setRecoveryState: (state: RecoveryState) => void
  readonly onResumeTokenError: () => boolean
}

type RecoveryState = 'ready' | 'resync_pending'

function isStaleResumeTokenError(error: ErrorMessage): boolean {
  const message = error.message.toLowerCase()
  return message.includes('unknown resume token') || message.includes('resume configuration mismatch')
}

function handleIncomingMessage(options: IncomingMessageOptions): SnapshotBaseline | null {
  const { parsed, diagnostics, snapshotBaseline, handlers, send, onMatchConfig, setRecoveryState } = options
  if (isMatchConfig(parsed)) {
    onMatchConfig(parsed)
    handlers.onMatchConfig?.(parsed)
    return snapshotBaseline
  }
  if (isSnapshotMessage(parsed)) {
    diagnostics.recordSnapshot(parsed)
    handlers.onSnapshot(parsed)
    setRecoveryState('ready')
    return parsed
  }
  if (isSnapshotDeltaMessage(parsed)) {
    if (diagnostics.recordDelta(parsed) || options.recoveryState === 'resync_pending') {
      if (options.recoveryState === 'ready') {
        setRecoveryState('resync_pending')
        diagnostics.recordResyncRequest()
        send(resyncRequest(snapshotBaseline, parsed))
      }
      return snapshotBaseline
    }
    const accepted = handlers.onSnapshotDelta?.(parsed)
    if (accepted === false) {
      setRecoveryState('resync_pending')
      diagnostics.recordResyncRequest()
      send(resyncRequest(snapshotBaseline, parsed))
      return snapshotBaseline
    }
    diagnostics.acceptBaseline(parsed)
    return parsed
  }
  if (isErrorMessage(parsed)) {
    if (isStaleResumeTokenError(parsed) && options.onResumeTokenError()) {
      return snapshotBaseline
    }
    handlers.onError?.(parsed)
  }
  return snapshotBaseline
}

function installTransportDebug(enabled: boolean, debug: TransportDebug): void {
  if (enabled && typeof window !== 'undefined') {
    window.__rtsTransportDebug = debug
  }
}

interface SocketOpenerOptions {
  readonly url: string
  readonly handlers: ConnectionHandlers
  readonly diagnostics: TransportDiagnostics
  readonly send: (payload: string) => void
  readonly request: () => MatchRequest
  readonly setRequest: (config: MatchConfig) => void
  readonly getBaseline: () => SnapshotBaseline | null
  readonly setBaseline: (baseline: SnapshotBaseline | null) => void
  readonly setSocket: (socket: WebSocket) => void
  readonly isCurrentSocket: (socket: WebSocket) => boolean
  readonly getRecoveryState: () => RecoveryState
  readonly setRecoveryState: (state: RecoveryState) => void
  readonly onResumeTokenError: () => boolean
}

function createSocketOpener(options: SocketOpenerOptions): () => void {
  return () => {
    options.diagnostics.setConnectionState('connecting')
    const next = new WebSocket(options.url)
    options.setSocket(next)
    next.addEventListener('open', () => {
      if (!options.isCurrentSocket(next)) {
        return
      }
      options.diagnostics.setConnectionState('open')
      next.send(JSON.stringify(options.request()))
      options.handlers.onOpen?.()
    })
    next.addEventListener('error', () => {
      if (!options.isCurrentSocket(next)) {
        return
      }
      options.handlers.onTransportError?.({ type: 'error', message: `failed to connect to ${options.url}` })
    })
    next.addEventListener('close', () => {
      if (!options.isCurrentSocket(next)) {
        return
      }
      options.diagnostics.setConnectionState('closed')
      options.handlers.onClose?.()
    })
    next.addEventListener('message', (event) => {
      if (!options.isCurrentSocket(next)) {
        return
      }
      let parsed: unknown
      try {
        parsed = JSON.parse(String(event.data))
      } catch {
        return // ignore malformed messages
      }
      const baseline = handleIncomingMessage({
        parsed,
        diagnostics: options.diagnostics,
        snapshotBaseline: options.getBaseline(),
        handlers: options.handlers,
        send: options.send,
        onMatchConfig: options.setRequest,
        recoveryState: options.getRecoveryState(),
        setRecoveryState: options.setRecoveryState,
        onResumeTokenError: options.onResumeTokenError
      })
      // A stale-token error restarts the handshake inside the handler; the
      // retired baseline must not be written back onto the fresh socket.
      if (options.isCurrentSocket(next)) {
        options.setBaseline(baseline)
      }
    })
  }
}

interface MatchConnectionRuntime {
  ws: WebSocket | null
  currentRequest: MatchRequest
  recoveryState: RecoveryState
  freshHandshakeRetried: boolean
  snapshotBaseline: SnapshotBaseline | null
  disposed: boolean
  openSocket: () => void
  readonly options: MatchConnectionOptions
}

function createMatchConnectionRuntime(request: MatchRequest, options: MatchConnectionOptions): MatchConnectionRuntime {
  return {
    ws: null,
    currentRequest: request,
    recoveryState: 'ready',
    freshHandshakeRetried: false,
    snapshotBaseline: null,
    disposed: false,
    openSocket: () => undefined,
    options
  }
}

function sendPayload(runtime: MatchConnectionRuntime, payload: string): void {
  if (runtime.disposed) {
    return
  }
  if (runtime.ws?.readyState === WebSocket.OPEN) {
    runtime.ws.send(payload)
  }
}

function updateCurrentRequest(
  runtime: MatchConnectionRuntime,
  config: MatchConfig,
  diagnostics: TransportDiagnostics
): void {
  if (runtime.disposed) {
    return
  }
  runtime.currentRequest = { ...runtime.currentRequest, resumeToken: config.resumeToken }
  diagnostics.setResumeToken(config.resumeToken)
  const { resumeToken: _resumeToken, ...request } = runtime.currentRequest
  const session: StoredMatchSession = {
    version: 1,
    resumeToken: config.resumeToken,
    request,
    spritesEnabled: runtime.options.spritesEnabled ?? true
  }
  saveMatchSession(session)
  removeNewMatchMarker()
}

function restartFreshHandshake(runtime: MatchConnectionRuntime): void {
  runtime.recoveryState = 'ready'
  runtime.snapshotBaseline = null
  runtime.ws?.close()
  runtime.openSocket()
}

function handleResumeTokenError(runtime: MatchConnectionRuntime, diagnostics: TransportDiagnostics): boolean {
  if (runtime.options.staleResumePolicy === 'fail') {
    clearMatchResumeState()
    runtime.ws?.close()
    runtime.options.onResumeUnavailable?.()
    return true
  }
  if (runtime.currentRequest.resumeToken === undefined || runtime.freshHandshakeRetried) {
    return false
  }
  runtime.freshHandshakeRetried = true
  clearMatchResumeToken()
  runtime.currentRequest = {
    type: runtime.currentRequest.type,
    protocolVersion: runtime.currentRequest.protocolVersion,
    scenarioId: runtime.currentRequest.scenarioId,
    aggression: runtime.currentRequest.aggression,
    map: runtime.currentRequest.map
  }
  diagnostics.clearResumeToken()
  restartFreshHandshake(runtime)
  return true
}

function configureSocket(
  url: string,
  handlers: ConnectionHandlers,
  runtime: MatchConnectionRuntime,
  diagnostics: TransportDiagnostics
): void {
  runtime.openSocket = createSocketOpener({
    url,
    handlers,
    diagnostics,
    send: (payload) => sendPayload(runtime, payload),
    request: () => runtime.currentRequest,
    setRequest: (config) => updateCurrentRequest(runtime, config, diagnostics),
    getBaseline: () => runtime.snapshotBaseline,
    setBaseline: (baseline) => {
      runtime.snapshotBaseline = baseline
    },
    setSocket: (socket) => {
      runtime.ws = socket
    },
    isCurrentSocket: (socket) => runtime.ws === socket && !runtime.disposed,
    getRecoveryState: () => runtime.recoveryState,
    setRecoveryState: (state) => {
      runtime.recoveryState = state
    },
    onResumeTokenError: () => handleResumeTokenError(runtime, diagnostics)
  })
}

function createMatchConnection(runtime: MatchConnectionRuntime, diagnostics: TransportDiagnostics): MatchConnection {
  return {
    sendCommand(intent) {
      sendPayload(runtime, JSON.stringify({ type: 'command', intent }))
    },
    reconnect() {
      diagnostics.debug.reconnect()
    },
    close() {
      if (runtime.disposed) {
        return
      }
      runtime.disposed = true
      const socket = runtime.ws
      runtime.ws = null
      runtime.snapshotBaseline = null
      runtime.recoveryState = 'ready'
      runtime.openSocket = () => undefined
      socket?.close()
    }
  }
}

export function connectMatch(
  url: string,
  request: MatchRequest,
  handlers: ConnectionHandlers,
  options: MatchConnectionOptions = {}
): MatchConnection {
  const runtime = createMatchConnectionRuntime(request, options)
  const debugEnabled = e2eTransportHookEnabled()
  const diagnostics = createTransportDiagnostics(
    debugEnabled,
    () => runtime.ws?.close(),
    () => {
      if (runtime.disposed) {
        return
      }
      runtime.ws?.close()
      runtime.openSocket()
    },
    runtime.currentRequest.resumeToken
  )
  configureSocket(url, handlers, runtime, diagnostics)
  installTransportDebug(debugEnabled, diagnostics.debug)
  runtime.openSocket()
  return createMatchConnection(runtime, diagnostics)
}
