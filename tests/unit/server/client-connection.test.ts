import {
  isMatchConfig,
  isMatchReleaseResult,
  isSnapshotDeltaMessage,
  isSnapshotMessage,
  type MatchConfig,
  PROTOCOL_VERSION
} from '@rts/protocol'
import { GameSession, MAX_PENDING_COMMANDS_PER_SESSION } from '@rts/server'
import { createRulesIdentity, deserializeState } from '@rts/simulation'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RawData } from 'ws'
import {
  ClientConnection,
  TERMINAL_RETENTION_MS,
  TICK_MS
} from '../../../apps/server/src/transport/client-connection.js'

type Listener = (...args: readonly never[]) => void

class FakeSocket {
  readonly OPEN = 1
  readonly readyState = this.OPEN
  readonly messages: string[] = []
  private readonly listeners = new Map<string, Listener[]>()

  on(event: 'message', listener: (raw: RawData) => void): this
  on(event: 'close', listener: () => void): this
  on(event: string, listener: Listener): this {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener])
    return this
  }

  send(message: string): void {
    this.messages.push(message)
  }

  close(): void {
    this.emit('close')
  }

  emit(event: string, ...args: readonly unknown[]): void {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(...(args as never[]))
    }
  }
}

function request() {
  return {
    type: 'match_request' as const,
    protocolVersion: PROTOCOL_VERSION,
    scenarioId: 'regression',
    aggression: 'passive' as const,
    map: { source: 'catalog' as const }
  }
}

function messages(socket: FakeSocket): readonly unknown[] {
  return socket.messages.map((message) => JSON.parse(message))
}

function lastPhase(socket: FakeSocket): string | undefined {
  return messages(socket)
    .filter((message) => isSnapshotMessage(message) || isSnapshotDeltaMessage(message))
    .at(-1)?.phase
}

function latestConfig(socket: FakeSocket): MatchConfig {
  const config = messages(socket).find(isMatchConfig)
  if (config === undefined) {
    throw new Error('expected match config')
  }
  return config
}

describe('client connection reconnect', () => {
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('keeps advancing while disconnected and resumes from the current full snapshot', () => {
    vi.useFakeTimers()
    const firstSocket = new FakeSocket()
    const first = new ClientConnection(firstSocket)
    first.start()
    firstSocket.emit('message', JSON.stringify(request()))
    const config = latestConfig(firstSocket)

    firstSocket.emit('close')
    vi.advanceTimersByTime(100)

    const reconnectSocket = new FakeSocket()
    const reconnect = new ClientConnection(reconnectSocket)
    reconnect.start()
    reconnectSocket.emit('message', JSON.stringify({ ...request(), resumeToken: config.resumeToken }))

    const reconnectMessages = messages(reconnectSocket)
    expect(reconnectMessages.some(isMatchConfig)).toBe(true)
    const snapshot = reconnectMessages.find(isSnapshotMessage)
    expect(snapshot?.tick).toBe(2)

    reconnectSocket.emit('close')
  })

  it('resends a full snapshot for a metadata-based resync request', () => {
    vi.useFakeTimers()
    const socket = new FakeSocket()
    const connection = new ClientConnection(socket)
    connection.start()
    socket.emit('message', JSON.stringify(request()))

    const initial = messages(socket).find(isSnapshotMessage)
    if (initial === undefined) {
      throw new Error('expected initial snapshot')
    }
    socket.emit(
      'message',
      JSON.stringify({
        type: 'snapshot_resync_request',
        baseSequence: initial.viewSequence,
        baseHash: initial.viewHash
      })
    )

    const snapshots = messages(socket).filter(isSnapshotMessage)
    expect(snapshots).toHaveLength(2)
    expect(snapshots[1]).toMatchObject({
      tick: initial.tick,
      viewSequence: initial.viewSequence + 1,
      viewHash: initial.viewHash
    })
    socket.emit('close')
  })

  it('keeps a disconnected match advancing until it is explicitly released', () => {
    vi.useFakeTimers()
    const firstSocket = new FakeSocket()
    const first = new ClientConnection(firstSocket)
    first.start()
    firstSocket.emit('message', JSON.stringify(request()))
    const config = latestConfig(firstSocket)
    firstSocket.emit('close')

    vi.advanceTimersByTime(TICK_MS * 4)

    const reconnectSocket = new FakeSocket()
    const reconnect = new ClientConnection(reconnectSocket)
    reconnect.start()
    reconnectSocket.emit('message', JSON.stringify({ ...request(), resumeToken: config.resumeToken }))

    expect(messages(reconnectSocket)).toContainEqual(expect.objectContaining({ type: 'snapshot', tick: 4 }))
    reconnectSocket.emit('close')
  })

  it('releases a disconnected match through the lifecycle message', () => {
    vi.useFakeTimers()
    const firstSocket = new FakeSocket()
    const first = new ClientConnection(firstSocket)
    first.start()
    firstSocket.emit('message', JSON.stringify(request()))
    const config = latestConfig(firstSocket)
    firstSocket.emit('close')

    const releaseSocket = new FakeSocket()
    const release = new ClientConnection(releaseSocket)
    release.start()
    releaseSocket.emit('message', JSON.stringify({ type: 'match_release', resumeToken: config.resumeToken }))

    expect(messages(releaseSocket).some(isMatchReleaseResult)).toBe(true)
    expect(messages(releaseSocket)).toContainEqual({ type: 'match_release_result', released: true })

    const expiredSocket = new FakeSocket()
    const expired = new ClientConnection(expiredSocket)
    expired.start()
    expiredSocket.emit('message', JSON.stringify({ ...request(), resumeToken: config.resumeToken }))
    expect(messages(expiredSocket)).toContainEqual({ type: 'error', message: 'unknown resume token' })
  })

  it('makes releasing an unknown match idempotent', () => {
    const releaseSocket = new FakeSocket()
    const release = new ClientConnection(releaseSocket)
    release.start()
    releaseSocket.emit('message', JSON.stringify({ type: 'match_release', resumeToken: 'unknown-token' }))

    expect(messages(releaseSocket)).toContainEqual({ type: 'match_release_result', released: false })
  })

  it('publishes one terminal snapshot, freezes the session, and expires it while connected', () => {
    vi.useFakeTimers()
    const socket = new FakeSocket()
    const connection = new ClientConnection(socket)
    connection.start()
    socket.emit('message', JSON.stringify(request()))
    const config = latestConfig(socket)
    const advance = vi.spyOn(GameSession.prototype, 'advance')

    socket.emit('message', JSON.stringify({ type: 'command', intent: { type: 'SURRENDER', payload: {} } }))
    vi.advanceTimersByTime(TICK_MS)

    expect(lastPhase(socket)).toBe('FINISHED')
    expect(advance).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(TICK_MS * 4)
    expect(advance).toHaveBeenCalledTimes(1)

    const reconnectSocket = new FakeSocket()
    const reconnect = new ClientConnection(reconnectSocket)
    reconnect.start()
    reconnectSocket.emit('message', JSON.stringify({ ...request(), resumeToken: config.resumeToken }))
    expect(lastPhase(reconnectSocket)).toBe('FINISHED')

    vi.advanceTimersByTime(TERMINAL_RETENTION_MS)
    const expiredSocket = new FakeSocket()
    const expired = new ClientConnection(expiredSocket)
    expired.start()
    expiredSocket.emit('message', JSON.stringify({ ...request(), resumeToken: config.resumeToken }))
    expect(messages(expiredSocket)).toContainEqual({ type: 'error', message: 'unknown resume token' })
  })

  it('releases a connected terminal runtime at retention expiry', () => {
    vi.useFakeTimers()
    const socket = new FakeSocket()
    const connection = new ClientConnection(socket)
    connection.start()
    socket.emit('message', JSON.stringify(request()))
    socket.emit('message', JSON.stringify({ type: 'command', intent: { type: 'SURRENDER', payload: {} } }))
    vi.advanceTimersByTime(TICK_MS)
    expect(lastPhase(socket)).toBe('FINISHED')

    const submit = vi.spyOn(GameSession.prototype, 'submit')
    const messagesBeforeExpiry = socket.messages.length
    vi.advanceTimersByTime(TERMINAL_RETENTION_MS)

    const snapshot = messages(socket).filter(isSnapshotMessage).at(-1)
    socket.emit(
      'message',
      JSON.stringify({
        type: 'snapshot_resync_request',
        baseSequence: snapshot?.viewSequence ?? 1,
        baseHash: snapshot?.viewHash ?? 'a'.repeat(64)
      })
    )
    socket.emit('message', JSON.stringify({ type: 'command', intent: { type: 'STOP', payload: { unitIds: [1] } } }))

    expect(socket.messages).toHaveLength(messagesBeforeExpiry)
    expect(submit).not.toHaveBeenCalled()
    expect(lastPhase(socket)).toBe('FINISHED')
  })

  it('disposes a connected terminal runtime idempotently', () => {
    vi.useFakeTimers()
    const socket = new FakeSocket()
    const connection = new ClientConnection(socket)
    connection.start()
    socket.emit('message', JSON.stringify(request()))
    const advance = vi.spyOn(GameSession.prototype, 'advance')
    socket.emit('message', JSON.stringify({ type: 'command', intent: { type: 'SURRENDER', payload: {} } }))
    vi.advanceTimersByTime(TICK_MS)

    vi.advanceTimersByTime(TERMINAL_RETENTION_MS)
    vi.advanceTimersByTime(TERMINAL_RETENTION_MS * 2)
    socket.emit('close')

    expect(advance).toHaveBeenCalledTimes(1)
    expect(lastPhase(socket)).toBe('FINISHED')
  })

  it('keeps terminal retention when the match finishes while disconnected', () => {
    vi.useFakeTimers()
    const firstSocket = new FakeSocket()
    const first = new ClientConnection(firstSocket)
    first.start()
    firstSocket.emit('message', JSON.stringify(request()))
    const config = latestConfig(firstSocket)
    const advance = vi.spyOn(GameSession.prototype, 'advance')
    const submit = vi.spyOn(GameSession.prototype, 'submit')

    firstSocket.emit('message', JSON.stringify({ type: 'command', intent: { type: 'SURRENDER', payload: {} } }))
    firstSocket.emit('close')
    vi.advanceTimersByTime(TICK_MS)

    expect(advance).toHaveBeenCalledTimes(1)
    expect(submit).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(TERMINAL_RETENTION_MS - TICK_MS)
    const reconnectSocket = new FakeSocket()
    const reconnect = new ClientConnection(reconnectSocket)
    reconnect.start()
    reconnectSocket.emit('message', JSON.stringify({ ...request(), resumeToken: config.resumeToken }))

    expect(lastPhase(reconnectSocket)).toBe('FINISHED')
    expect(submit).toHaveBeenCalledTimes(1)
    expect(advance).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(TICK_MS * 2)
    const expiredSocket = new FakeSocket()
    const expired = new ClientConnection(expiredSocket)
    expired.start()
    expiredSocket.emit('message', JSON.stringify({ ...request(), resumeToken: config.resumeToken }))
    expect(messages(expiredSocket)).toContainEqual({ type: 'error', message: 'unknown resume token' })
  })

  it('rejects a resume token presented with a different aggression', () => {
    vi.useFakeTimers()
    const socket = new FakeSocket()
    const connection = new ClientConnection(socket)
    connection.start()
    socket.emit('message', JSON.stringify(request()))
    const config = latestConfig(socket)
    socket.emit('close')

    const mismatchSocket = new FakeSocket()
    const mismatch = new ClientConnection(mismatchSocket)
    mismatch.start()
    mismatchSocket.emit(
      'message',
      JSON.stringify({ ...request(), aggression: 'offensive', resumeToken: config.resumeToken })
    )
    expect(messages(mismatchSocket)).toContainEqual({
      type: 'error',
      message: 'resume configuration mismatch'
    })

    const correctSocket = new FakeSocket()
    const correct = new ClientConnection(correctSocket)
    correct.start()
    correctSocket.emit('message', JSON.stringify({ ...request(), resumeToken: config.resumeToken }))
    expect(messages(correctSocket).some(isMatchConfig)).toBe(true)

    mismatchSocket.emit('close')
    correctSocket.emit('close')
  })

  it('rejects a resume token presented with a different scenario', () => {
    vi.useFakeTimers()
    const socket = new FakeSocket()
    const connection = new ClientConnection(socket)
    connection.start()
    socket.emit('message', JSON.stringify(request()))
    const config = latestConfig(socket)
    socket.emit('close')

    const mismatchSocket = new FakeSocket()
    const mismatch = new ClientConnection(mismatchSocket)
    mismatch.start()
    mismatchSocket.emit(
      'message',
      JSON.stringify({ ...request(), scenarioId: 'default', resumeToken: config.resumeToken })
    )
    expect(messages(mismatchSocket)).toContainEqual({
      type: 'error',
      message: 'resume configuration mismatch'
    })
    mismatchSocket.emit('close')
  })

  it('rejects a resume token presented with a different map', () => {
    vi.useFakeTimers()
    const socket = new FakeSocket()
    const connection = new ClientConnection(socket)
    connection.start()
    socket.emit('message', JSON.stringify(request()))
    const config = latestConfig(socket)
    socket.emit('close')

    const mismatchSocket = new FakeSocket()
    const mismatch = new ClientConnection(mismatchSocket)
    mismatch.start()
    mismatchSocket.emit(
      'message',
      JSON.stringify({
        ...request(),
        map: { source: 'local', definition: { width: 1, height: 1, tiles: ['land'], resources: [] } },
        resumeToken: config.resumeToken
      })
    )
    expect(messages(mismatchSocket)).toContainEqual({
      type: 'error',
      message: 'resume configuration mismatch'
    })
    mismatchSocket.emit('close')
  })

  it('removes command authority from a superseded socket', () => {
    vi.useFakeTimers()
    const firstSocket = new FakeSocket()
    const first = new ClientConnection(firstSocket)
    first.start()
    firstSocket.emit('message', JSON.stringify(request()))
    const config = latestConfig(firstSocket)
    const submit = vi.spyOn(GameSession.prototype, 'submit')

    const secondSocket = new FakeSocket()
    const second = new ClientConnection(secondSocket)
    second.start()
    secondSocket.emit('message', JSON.stringify({ ...request(), resumeToken: config.resumeToken }))

    firstSocket.emit('message', JSON.stringify({ type: 'command', intent: { type: 'SURRENDER', payload: {} } }))
    secondSocket.emit('message', JSON.stringify({ type: 'command', intent: { type: 'SURRENDER', payload: {} } }))

    expect(submit).toHaveBeenCalledOnce()
    secondSocket.emit('close')
  })

  it('bounds pending network commands at the session boundary', () => {
    const session = GameSession.create({ seed: 1, identity: createRulesIdentity('pending-limit') })
    const commands = Array.from({ length: MAX_PENDING_COMMANDS_PER_SESSION }, (_, index) => ({
      tick: 10,
      playerId: 0 as const,
      sequence: index + 1,
      intent: { type: 'SURRENDER' as const, payload: {} }
    }))

    session.submit(0, commands)

    expect(() => session.submit(0, [commands[0]!])).toThrow(/pending command limit/)
    session.advance()
    expect(deserializeState(session.snapshot().bytes).pendingCommands).toHaveLength(MAX_PENDING_COMMANDS_PER_SESSION)
  })
})
