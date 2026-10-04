import {
  isMatchConfig,
  type MatchConfig,
  type MatchRequest,
  PROTOCOL_VERSION,
  type SnapshotDeltaMessage,
  type SnapshotMessage
} from '@rts/protocol'
import { describe, expect, it, vi } from 'vitest'
import { connectMatch, startNewMatch } from '../../../apps/web/src/shared/transport/connection'

class FakeWebSocket {
  static readonly OPEN = 1
  readonly OPEN = FakeWebSocket.OPEN
  readonly sent: string[] = []
  readyState = FakeWebSocket.OPEN
  private readonly listeners = new Map<string, ((event: { readonly data?: string }) => void)[]>()

  addEventListener(type: string, listener: (event: { readonly data?: string }) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }

  send(payload: string): void {
    this.sent.push(payload)
  }

  close(): void {
    this.readyState = 0
  }

  emit(type: string, data?: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ data })
    }
  }
}

const request: MatchRequest = {
  type: 'match_request',
  protocolVersion: PROTOCOL_VERSION,
  scenarioId: 'regression',
  aggression: 'passive',
  map: { source: 'catalog' }
}

const matchConfig: MatchConfig = {
  type: 'match_config',
  protocolVersion: PROTOCOL_VERSION,
  resumeToken: 'resume-token',
  scenario: { id: 'regression', label: 'Regression' },
  scenarios: [{ id: 'default', label: 'Default' }],
  map: { width: 2, height: 2, tiles: ['land', 'land', 'land', 'land'], resources: [] },
  buildings: [],
  production: [],
  research: []
}

describe('match transport snapshot resync', () => {
  it('requests an authoritative full snapshot when a delta is rejected', () => {
    const socket = new FakeWebSocket()
    vi.stubGlobal(
      'WebSocket',
      class extends FakeWebSocket {
        constructor() {
          super()
          Object.assign(this, socket)
        }
      }
    )
    const onSnapshotDelta = vi.fn(() => false)
    const onSnapshot = vi.fn()
    connectMatch('ws://test', request, { onSnapshot, onSnapshotDelta })

    socket.emit(
      'message',
      JSON.stringify({
        type: 'snapshot',
        tick: 3,
        viewSequence: 1,
        viewHash: 'a'.repeat(64),
        phase: 'RUNNING',
        units: [],
        buildings: [],
        resources: [],
        resourcesComplete: true,
        players: [],
        events: []
      })
    )

    socket.emit(
      'message',
      JSON.stringify({
        type: 'snapshot_delta',
        baseTick: 3,
        baseSequence: 1,
        baseHash: 'a'.repeat(64),
        tick: 4,
        viewSequence: 2,
        viewHash: 'b'.repeat(64),
        phase: 'RUNNING',
        units: [],
        removedUnitIds: [],
        buildings: [],
        removedBuildingIds: [],
        resources: [],
        resourcesComplete: false,
        players: [],
        events: []
      })
    )

    expect(onSnapshot).toHaveBeenCalledOnce()
    expect(onSnapshotDelta).toHaveBeenCalledOnce()
    expect(socket.sent).toContain(
      JSON.stringify({ type: 'snapshot_resync_request', baseSequence: 1, baseHash: 'a'.repeat(64) })
    )
    vi.unstubAllGlobals()
  })

  it('enters recovery once, suppresses stale deltas, and resumes after a full snapshot', () => {
    const socket = new FakeWebSocket()
    vi.stubGlobal(
      'WebSocket',
      class extends FakeWebSocket {
        constructor() {
          super()
          Object.assign(this, socket)
        }
      }
    )
    const onSnapshot = vi.fn()
    const onSnapshotDelta = vi.fn().mockReturnValueOnce(false).mockReturnValue(true)
    connectMatch('ws://test', request, { onSnapshot, onSnapshotDelta })

    const baseline: SnapshotMessage = {
      type: 'snapshot',
      tick: 3,
      viewSequence: 1,
      viewHash: 'a'.repeat(64),
      phase: 'RUNNING',
      units: [],
      buildings: [],
      resources: [],
      resourcesComplete: true,
      players: [],
      events: []
    }
    const delta: SnapshotDeltaMessage = {
      type: 'snapshot_delta',
      baseTick: 3,
      baseSequence: 1,
      baseHash: 'a'.repeat(64),
      tick: 4,
      viewSequence: 2,
      viewHash: 'b'.repeat(64),
      phase: 'RUNNING',
      units: [],
      removedUnitIds: [],
      buildings: [],
      removedBuildingIds: [],
      resources: [],
      resourcesComplete: false,
      players: [],
      events: []
    }
    socket.emit('message', JSON.stringify(baseline))
    socket.emit('message', JSON.stringify(delta))
    socket.emit('message', JSON.stringify({ ...delta, tick: 5, viewSequence: 3, viewHash: 'c'.repeat(64) }))

    expect(onSnapshotDelta).toHaveBeenCalledOnce()
    expect(socket.sent.filter((payload) => payload.includes('snapshot_resync_request'))).toHaveLength(1)

    socket.emit('message', JSON.stringify({ ...baseline, tick: 5, viewSequence: 4, viewHash: 'd'.repeat(64) }))
    socket.emit(
      'message',
      JSON.stringify({ ...delta, baseTick: 5, baseSequence: 4, baseHash: 'd'.repeat(64), tick: 6, viewSequence: 5 })
    )
    expect(onSnapshot).toHaveBeenCalledTimes(2)
    expect(onSnapshotDelta).toHaveBeenCalledTimes(2)
    vi.unstubAllGlobals()
  })

  it('reconnects with the resume token from the match config', () => {
    const sockets: FakeWebSocket[] = []
    vi.stubGlobal(
      'WebSocket',
      class extends FakeWebSocket {
        constructor() {
          super()
          sockets.push(this)
        }
      }
    )
    const connection = connectMatch('ws://test', request, { onSnapshot: vi.fn() })
    const config: MatchConfig = {
      type: 'match_config',
      protocolVersion: PROTOCOL_VERSION,
      resumeToken: 'resume-token',
      scenario: { id: 'regression', label: 'Regression' },
      scenarios: [{ id: 'default', label: 'Default' }],
      map: { width: 2, height: 2, tiles: ['land', 'land', 'land', 'land'], resources: [] },
      buildings: [],
      production: [],
      research: []
    }
    expect(isMatchConfig(config)).toBe(true)

    sockets[0]!.emit('open')
    sockets[0]!.emit('message', JSON.stringify(config))
    connection.reconnect()
    sockets[1]!.emit('open')

    expect(JSON.parse(sockets[1]!.sent[0]!)).toMatchObject({
      type: 'match_request',
      resumeToken: 'resume-token'
    })
    vi.unstubAllGlobals()
  })

  it('does not report the replaced socket closing after reconnect', () => {
    const sockets: FakeWebSocket[] = []
    const onClose = vi.fn()
    vi.stubGlobal(
      'WebSocket',
      class extends FakeWebSocket {
        constructor() {
          super()
          sockets.push(this)
        }
      }
    )
    const connection = connectMatch('ws://test', request, { onSnapshot: vi.fn(), onClose })

    connection.reconnect()
    sockets[0]!.emit('close')
    expect(onClose).not.toHaveBeenCalled()
    sockets[1]!.emit('close')
    expect(onClose).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })

  it('ignores every lifecycle event from a replaced socket', () => {
    const sockets: FakeWebSocket[] = []
    const onOpen = vi.fn()
    const onClose = vi.fn()
    const onTransportError = vi.fn()
    vi.stubGlobal(
      'WebSocket',
      class extends FakeWebSocket {
        constructor() {
          super()
          sockets.push(this)
        }
      }
    )
    const connection = connectMatch('ws://test', request, { onSnapshot: vi.fn(), onOpen, onClose, onTransportError })

    connection.reconnect()
    sockets[0]!.emit('open')
    sockets[0]!.emit('error')
    sockets[0]!.emit('close')

    expect(sockets[0]!.sent).toEqual([])
    expect(onOpen).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(onTransportError).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('retries an expired resume token with one fresh handshake', () => {
    const sockets: FakeWebSocket[] = []
    vi.stubGlobal(
      'WebSocket',
      class extends FakeWebSocket {
        constructor() {
          super()
          sockets.push(this)
        }
      }
    )
    connectMatch('ws://test', { ...request, resumeToken: 'stale-token' }, { onSnapshot: vi.fn() })
    sockets[0]!.emit('open')
    sockets[0]!.emit('message', JSON.stringify({ type: 'error', message: 'unknown resume token' }))

    expect(sockets).toHaveLength(2)
    sockets[1]!.emit('open')
    expect(JSON.parse(sockets[1]!.sent[0]!)).not.toHaveProperty('resumeToken')
    sockets[1]!.emit('message', JSON.stringify({ type: 'error', message: 'unknown resume token' }))
    expect(sockets).toHaveLength(2)
    vi.unstubAllGlobals()
  })

  it('clears the stored token before an intentional new match reload', () => {
    const removeItem = vi.fn()
    const reload = vi.fn()
    vi.stubGlobal('sessionStorage', { removeItem })

    startNewMatch(reload)

    expect(removeItem).toHaveBeenCalledOnce()
    expect(reload).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })

  it('invalidates the connection after close', () => {
    const sockets: FakeWebSocket[] = []
    vi.stubGlobal(
      'WebSocket',
      class extends FakeWebSocket {
        constructor() {
          super()
          sockets.push(this)
        }
      }
    )
    const setItem = vi.fn()
    vi.stubGlobal('sessionStorage', { getItem: () => null, setItem, removeItem: vi.fn() })
    const onOpen = vi.fn()
    const onClose = vi.fn()
    const onTransportError = vi.fn()
    const onSnapshot = vi.fn()
    const connection = connectMatch('ws://test', request, { onSnapshot, onOpen, onClose, onTransportError })
    sockets[0]!.emit('open')
    const sentBeforeClose = sockets[0]!.sent.length

    connection.close()
    sockets[0]!.emit('open')
    sockets[0]!.emit('error')
    sockets[0]!.emit('close')
    sockets[0]!.emit('message', JSON.stringify(matchConfig))
    connection.sendCommand({ type: 'STOP', payload: { unitIds: [1] } })
    connection.reconnect()

    expect(onOpen).toHaveBeenCalledOnce()
    expect(onClose).not.toHaveBeenCalled()
    expect(onTransportError).not.toHaveBeenCalled()
    expect(onSnapshot).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
    expect(sockets[0]!.sent).toHaveLength(sentBeforeClose)
    expect(sockets).toHaveLength(1)
    vi.unstubAllGlobals()
  })

  it('never reports stale socket closes across repeated reconnects', () => {
    const sockets: FakeWebSocket[] = []
    vi.stubGlobal(
      'WebSocket',
      class extends FakeWebSocket {
        constructor() {
          super()
          sockets.push(this)
        }
      }
    )
    const onClose = vi.fn()
    const connection = connectMatch('ws://test', request, { onSnapshot: vi.fn(), onClose })

    connection.reconnect()
    connection.reconnect()
    sockets[0]!.emit('close')
    sockets[1]!.emit('close')
    expect(onClose).not.toHaveBeenCalled()

    sockets[2]!.emit('close')
    expect(onClose).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })

  it('starts the fresh handshake without the retired baseline', () => {
    const sockets: FakeWebSocket[] = []
    vi.stubGlobal(
      'WebSocket',
      class extends FakeWebSocket {
        constructor() {
          super()
          sockets.push(this)
        }
      }
    )
    const onSnapshot = vi.fn()
    const onSnapshotDelta = vi.fn(() => false)
    connectMatch('ws://test', { ...request, resumeToken: 'stale-token' }, { onSnapshot, onSnapshotDelta })

    sockets[0]!.emit('open')
    sockets[0]!.emit(
      'message',
      JSON.stringify({
        type: 'snapshot',
        tick: 3,
        viewSequence: 1,
        viewHash: 'a'.repeat(64),
        phase: 'RUNNING',
        units: [],
        buildings: [],
        resources: [],
        resourcesComplete: true,
        players: [],
        events: []
      })
    )
    sockets[0]!.emit('message', JSON.stringify({ type: 'error', message: 'resume configuration mismatch' }))

    expect(sockets).toHaveLength(2)
    sockets[1]!.emit('open')
    sockets[1]!.emit(
      'message',
      JSON.stringify({
        type: 'snapshot_delta',
        baseTick: 3,
        baseSequence: 1,
        baseHash: 'a'.repeat(64),
        tick: 4,
        viewSequence: 2,
        viewHash: 'b'.repeat(64),
        phase: 'RUNNING',
        units: [],
        removedUnitIds: [],
        buildings: [],
        removedBuildingIds: [],
        resources: [],
        resourcesComplete: false,
        players: [],
        events: []
      })
    )

    const resync = sockets[1]!.sent
      .map((payload) => JSON.parse(payload))
      .find((payload) => payload.type === 'snapshot_resync_request')
    expect(resync).toEqual({ type: 'snapshot_resync_request', baseSequence: 2, baseHash: 'b'.repeat(64) })
    vi.unstubAllGlobals()
  })
})
