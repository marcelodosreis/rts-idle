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
import { createTransportDiagnostics, type TransportDiagnostics } from './transport-diagnostics'

export type { SnapshotMessage }

export interface MatchConnection {
  sendCommand(intent: CommandIntent): void
  reconnect(): void
  close(): void
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

const CONNECTION_STATES = ['connecting', 'open', 'closed'] as const
type ConnectionState = (typeof CONNECTION_STATES)[number]

export interface TransportMessageTrace {
  readonly type: 'snapshot' | 'snapshot_delta'
  readonly tick: number
  readonly viewSequence: number
  readonly viewHash: string
  readonly baseSequence?: number
  readonly unitCount: number
  readonly buildingCount: number
  readonly resourceCount: number
  readonly playerCount: number
  readonly resourcesComplete: boolean
  readonly dropped: boolean
}

export interface TransportBaselineTrace {
  readonly tick: number
  readonly viewSequence: number
  readonly viewHash: string
}

export interface TransportDebugState {
  readonly connectionState: ConnectionState
  readonly resumeToken: string | null
  readonly messages: readonly TransportMessageTrace[]
  readonly acceptedBaseline: TransportBaselineTrace | null
  readonly resyncRequests: number
  readonly droppedDeltas: number
}

export interface TransportDebug {
  disconnect(): void
  reconnect(): void
  dropNextDelta(): void
  getState(): TransportDebugState
}

declare global {
  interface Window {
    __rtsTransportDebug?: TransportDebug
  }
}

const RESUME_TOKEN_KEY = 'rts-idle.resume-token'

export function clearMatchResumeToken(): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(RESUME_TOKEN_KEY)
  }
}

export function startNewMatch(reload: () => void): void {
  clearMatchResumeToken()
  reload()
}

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

function storedResumeToken(): string | undefined {
  if (typeof sessionStorage === 'undefined') {
    return undefined
  }
  return sessionStorage.getItem(RESUME_TOKEN_KEY) ?? undefined
}

function saveResumeToken(token: string): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(RESUME_TOKEN_KEY, token)
  }
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
  return message.includes('unknown resume token') || message.includes('expired resume token')
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
  readonly isSuppressedSocket: (socket: WebSocket) => boolean
  readonly getRecoveryState: () => RecoveryState
  readonly setRecoveryState: (state: RecoveryState) => void
  readonly onResumeTokenError: () => boolean
}

function createSocketOpener(options: SocketOpenerOptions): () => void {
  const {
    url,
    handlers,
    diagnostics,
    send,
    setRequest,
    getBaseline,
    setBaseline,
    setSocket,
    isCurrentSocket,
    getRecoveryState,
    setRecoveryState,
    onResumeTokenError
  } = options
  return () => {
    diagnostics.setConnectionState('connecting')
    const next = new WebSocket(url)
    setSocket(next)
    next.addEventListener('open', () => {
      diagnostics.setConnectionState('open')
      next.send(JSON.stringify(options.request()))
      handlers.onOpen?.()
    })
    next.addEventListener('error', () => {
      handlers.onTransportError?.({ type: 'error', message: `failed to connect to ${url}` })
    })
    next.addEventListener('close', () => {
      if (isCurrentSocket(next)) {
        diagnostics.setConnectionState('closed')
      }
      if (!options.isSuppressedSocket(next)) {
        handlers.onClose?.()
      }
    })
    next.addEventListener('message', (event) => {
      if (!isCurrentSocket(next)) {
        return
      }
      let parsed: unknown
      try {
        parsed = JSON.parse(String(event.data))
      } catch {
        return // ignore malformed messages
      }
      setBaseline(
        handleIncomingMessage({
          parsed,
          diagnostics,
          snapshotBaseline: getBaseline(),
          handlers,
          send,
          onMatchConfig: setRequest,
          recoveryState: getRecoveryState(),
          setRecoveryState,
          onResumeTokenError
        })
      )
    })
  }
}

interface MatchConnectionRuntime {
  ws: WebSocket | null
  currentRequest: MatchRequest
  recoveryState: RecoveryState
  freshHandshakeRetried: boolean
  suppressedCloseSockets: Set<WebSocket>
  snapshotBaseline: SnapshotBaseline | null
  openSocket: () => void
}

function createMatchConnectionRuntime(request: MatchRequest): MatchConnectionRuntime {
  const storedToken = request.resumeToken === undefined ? storedResumeToken() : undefined
  return {
    ws: null,
    currentRequest: storedToken === undefined ? request : { ...request, resumeToken: storedToken },
    recoveryState: 'ready',
    freshHandshakeRetried: false,
    suppressedCloseSockets: new Set<WebSocket>(),
    snapshotBaseline: null,
    openSocket: () => undefined
  }
}

function sendPayload(runtime: MatchConnectionRuntime, payload: string): void {
  if (runtime.ws?.readyState === WebSocket.OPEN) {
    runtime.ws.send(payload)
  }
}

function updateCurrentRequest(
  runtime: MatchConnectionRuntime,
  config: MatchConfig,
  diagnostics: TransportDiagnostics
): void {
  runtime.currentRequest = { ...runtime.currentRequest, resumeToken: config.resumeToken }
  diagnostics.setResumeToken(config.resumeToken)
  saveResumeToken(config.resumeToken)
}

function restartFreshHandshake(runtime: MatchConnectionRuntime): void {
  runtime.recoveryState = 'ready'
  runtime.snapshotBaseline = null
  if (runtime.ws !== null) {
    runtime.suppressedCloseSockets.add(runtime.ws)
    runtime.ws.close()
  }
  runtime.openSocket()
}

function handleResumeTokenError(runtime: MatchConnectionRuntime, diagnostics: TransportDiagnostics): boolean {
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
    isCurrentSocket: (socket) => runtime.ws === socket,
    isSuppressedSocket: (socket) => runtime.suppressedCloseSockets.delete(socket),
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
      runtime.ws?.close()
    }
  }
}

export function connectMatch(url: string, request: MatchRequest, handlers: ConnectionHandlers): MatchConnection {
  const runtime = createMatchConnectionRuntime(request)
  const debugEnabled = e2eTransportHookEnabled()
  const diagnostics = createTransportDiagnostics(
    debugEnabled,
    () => runtime.ws?.close(),
    () => {
      if (runtime.ws !== null) {
        runtime.suppressedCloseSockets.add(runtime.ws)
        runtime.ws.close()
      }
      runtime.openSocket()
    },
    runtime.currentRequest.resumeToken
  )
  configureSocket(url, handlers, runtime, diagnostics)
  installTransportDebug(debugEnabled, diagnostics.debug)
  runtime.openSocket()
  return createMatchConnection(runtime, diagnostics)
}
