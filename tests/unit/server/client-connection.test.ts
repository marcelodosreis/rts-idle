import { isMatchConfig, isSnapshotMessage, type MatchConfig, PROTOCOL_VERSION } from '@rts/protocol'
import { GameSession, MAX_PENDING_COMMANDS_PER_SESSION } from '@rts/server'
import { createRulesIdentity, deserializeState } from '@rts/simulation'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RawData } from 'ws'
import { ClientConnection, RECONNECT_GRACE_MS } from '../../../apps/server/src/transport/client-connection.js'

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

  it('expires a disconnected match after the reconnect grace window', () => {
    vi.useFakeTimers()
    const firstSocket = new FakeSocket()
    const first = new ClientConnection(firstSocket)
    first.start()
    firstSocket.emit('message', JSON.stringify(request()))
    const config = latestConfig(firstSocket)
    firstSocket.emit('close')

    vi.advanceTimersByTime(RECONNECT_GRACE_MS)

    const expiredSocket = new FakeSocket()
    const expired = new ClientConnection(expiredSocket)
    expired.start()
    expiredSocket.emit('message', JSON.stringify({ ...request(), resumeToken: config.resumeToken }))

    expect(messages(expiredSocket)).toContainEqual({ type: 'error', message: 'unknown resume token' })
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
