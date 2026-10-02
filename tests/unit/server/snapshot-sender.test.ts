import {
  isSnapshotDeltaMessage,
  isSnapshotMessage,
  PROTOCOL_VERSION,
  type SnapshotDeltaMessage,
  type SnapshotMessage
} from '@rts/protocol'
import { createUnitEntity, createWorld } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { createAuthoritativeMatch } from '../../../apps/server/src/bootstrap/match-bootstrap.js'
import { GameSession } from '../../../apps/server/src/sessions/session.js'
import { SnapshotSender } from '../../../apps/server/src/transport/snapshot-sender.js'
import { SEEDS, TEST_IDENTITY } from '../../fixtures/index.js'

class FakeSocket {
  readonly OPEN = 1
  readonly readyState = this.OPEN
  readonly messages: string[] = []

  send(data: string): void {
    this.messages.push(data)
  }
}

function session(): GameSession {
  return createAuthoritativeMatch({
    type: 'match_request',
    protocolVersion: PROTOCOL_VERSION,
    scenarioId: 'default',
    aggression: 'passive',
    map: { source: 'catalog' }
  }).session
}

function boundedSession(): GameSession {
  const world = createWorld({ changeHistoryLimit: 4 })
  createUnitEntity(world, { id: 1, x: 0, y: 0, owner: 0, kind: 'pawn', worker: true })
  return GameSession.create({ seed: SEEDS.simulation.fixedTick, identity: TEST_IDENTITY, initialWorld: world })
}

function message(socket: FakeSocket): SnapshotMessage | SnapshotDeltaMessage {
  const parsed: unknown = JSON.parse(socket.messages.at(-1)!)
  if (isSnapshotMessage(parsed) || isSnapshotDeltaMessage(parsed)) {
    return parsed
  }
  throw new Error('expected snapshot message')
}

function mergeEntities<T extends { readonly id: number }>(
  current: readonly T[],
  changed: readonly T[],
  removedIds: readonly number[]
): readonly T[] {
  const replacedIds = new Set(changed.map((entity) => entity.id))
  const removed = new Set(removedIds)
  return [...current.filter((entity) => !replacedIds.has(entity.id) && !removed.has(entity.id)), ...changed].sort(
    (first, second) => first.id - second.id
  )
}

function mergeResources(
  current: SnapshotMessage['resources'],
  changed: SnapshotDeltaMessage['resources']
): SnapshotMessage['resources'] {
  const changedIds = new Set(changed.map((resource) => resource.resourceId))
  return [...current.filter((resource) => !changedIds.has(resource.resourceId)), ...changed].sort(
    (first, second) => first.resourceId - second.resourceId
  )
}

function applyDelta(snapshot: SnapshotMessage, delta: SnapshotDeltaMessage): SnapshotMessage {
  return {
    ...snapshot,
    tick: delta.tick,
    viewSequence: delta.viewSequence,
    viewHash: delta.viewHash,
    phase: delta.phase,
    units: mergeEntities(snapshot.units, delta.units, delta.removedUnitIds),
    buildings: mergeEntities(snapshot.buildings, delta.buildings, delta.removedBuildingIds),
    resources: mergeResources(snapshot.resources, delta.resources),
    resourcesComplete: true,
    players: delta.players,
    events: delta.events
  }
}

describe('authoritative snapshot sender', () => {
  it('sends one full state followed by an idle O(changed) delta', () => {
    const game = session()
    const socket = new FakeSocket()
    const sender = new SnapshotSender(socket)

    sender.sendSnapshot(game, [])
    const full = message(socket)
    expect(full).toMatchObject({ type: 'snapshot', viewSequence: 1, viewHash: game.hashState() })
    game.advance()
    sender.sendSnapshot(game, [])

    const delta = message(socket)
    expect(delta).toMatchObject({
      type: 'snapshot_delta',
      baseTick: 0,
      baseSequence: 1,
      baseHash: full.type === 'snapshot' ? full.viewHash : '',
      tick: 1,
      viewSequence: 2,
      viewHash: game.hashState(),
      units: [],
      buildings: []
    })
    expect(delta.type === 'snapshot_delta' ? delta.resources : []).toEqual([])
  })

  it('sends only an entity changed by an authoritative command', () => {
    const game = session()
    const socket = new FakeSocket()
    const sender = new SnapshotSender(socket)
    sender.sendSnapshot(game, [])
    const unitId = game.observe(true).units[0]!.id

    game.submit(0, [
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'MOVE', payload: { unitIds: [unitId], x: 512, y: 512 } }
      }
    ])
    game.advance()
    sender.sendSnapshot(game, [])

    const delta = message(socket)
    expect(delta.type).toBe('snapshot_delta')
    expect(delta.type === 'snapshot_delta' ? delta.units.map(({ id }) => id) : []).toEqual([unitId])
  })

  it('does not resend idle entities when a player resource changes', () => {
    const game = session()
    const socket = new FakeSocket()
    const sender = new SnapshotSender(socket)
    sender.sendSnapshot(game, [])
    const workerId = game.observe(true).units.find((unit) => unit.owner === 0)!.id
    const resourceId = game.observe(true).resources[0]!.resourceId

    game.submit(0, [
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'GATHER', payload: { unitIds: [workerId], resourceId } }
      }
    ])
    game.advance()
    for (let tick = 1; tick < 500; tick += 1) {
      game.advance()
    }
    expect(game.observe(true).players[0]!.resources.WOOD).toBeGreaterThan(0)
    sender.sendSnapshot(game, [])

    const delta = message(socket)
    expect(delta.type === 'snapshot_delta' ? delta.units.map(({ id }) => id) : []).toEqual([workerId])
  })

  it('resets to a full state after a client requests resynchronization', () => {
    const game = session()
    const socket = new FakeSocket()
    const sender = new SnapshotSender(socket)
    sender.sendSnapshot(game, [])
    game.advance()
    sender.sendSnapshot(game, [])

    sender.reset()
    sender.sendSnapshot(game, [])
    const full = message(socket)
    expect(full.type).toBe('snapshot')
    expect(full.type === 'snapshot' ? full.tick : -1).toBe(1)
    expect(full.type === 'snapshot' ? full.viewSequence : -1).toBe(3)

    game.advance()
    sender.sendSnapshot(game, [])
    expect(message(socket)).toMatchObject({
      type: 'snapshot_delta',
      baseTick: 1,
      baseSequence: 3,
      tick: 2,
      viewSequence: 4
    })
  })

  it('reports authoritative entity removals without scanning the full state', () => {
    const game = session()
    const socket = new FakeSocket()
    const sender = new SnapshotSender(socket)
    sender.sendSnapshot(game, [])
    game.submit(0, [{ tick: 1, playerId: 0, sequence: 1, intent: { type: 'SURRENDER', payload: {} } }])
    game.advance()
    sender.sendSnapshot(game, [])

    const delta = message(socket)
    expect(delta.type === 'snapshot_delta' ? delta.removedUnitIds : []).toEqual([1, 2, 3, 4, 5])
  })

  it('supports a dropped or out-of-order delta by resending current authority', () => {
    const game = session()
    const firstSocket = new FakeSocket()
    const sender = new SnapshotSender(firstSocket)
    sender.sendSnapshot(game, [])
    game.advance()
    sender.sendSnapshot(game, [])
    game.advance()
    sender.sendSnapshot(game, [])

    sender.reset()
    sender.sendSnapshot(game, [])
    expect(message(firstSocket)).toMatchObject({ type: 'snapshot', tick: 2 })
    game.advance()
    sender.sendSnapshot(game, [])
    expect(message(firstSocket)).toMatchObject({ type: 'snapshot_delta', baseTick: 2, tick: 3 })
  })

  it('refreshes the full baseline periodically', () => {
    const game = session()
    const socket = new FakeSocket()
    const sender = new SnapshotSender(socket)
    sender.sendSnapshot(game, [])

    for (let tick = 1; tick <= 40; tick += 1) {
      game.advance()
      sender.sendSnapshot(game, [])
    }

    expect(message(socket)).toMatchObject({ type: 'snapshot', tick: 40 })
  })

  it('gives a new connection a full authoritative state and then deltas', () => {
    const game = session()
    const first = new FakeSocket()
    const reconnect = new FakeSocket()
    const firstSender = new SnapshotSender(first)
    const reconnectSender = new SnapshotSender(reconnect)

    firstSender.sendSnapshot(game, [])
    game.advance()
    reconnectSender.sendSnapshot(game, [])
    expect(message(reconnect)).toMatchObject({ type: 'snapshot', tick: 1 })
    game.advance()
    reconnectSender.sendSnapshot(game, [])
    expect(message(reconnect)).toMatchObject({ type: 'snapshot_delta', baseTick: 1, tick: 2 })
  })

  it('reconstructs authoritative state from a full baseline and subsequent deltas', () => {
    const game = session()
    const socket = new FakeSocket()
    const sender = new SnapshotSender(socket)
    sender.sendSnapshot(game, [])
    const baseline = message(socket)
    if (baseline.type !== 'snapshot') {
      throw new Error('expected full baseline')
    }

    const unitId = baseline.units[0]!.id
    game.submit(0, [
      {
        tick: 1,
        playerId: 0,
        sequence: 1,
        intent: { type: 'MOVE', payload: { unitIds: [unitId], x: 512, y: 512 } }
      }
    ])
    let view = baseline
    for (let tick = 1; tick <= 5; tick += 1) {
      game.advance()
      sender.sendSnapshot(game, [])
      const delta = message(socket)
      if (delta.type !== 'snapshot_delta') {
        throw new Error('expected delta after baseline')
      }
      view = applyDelta(view, delta)
    }

    const authoritative = game.observe(true)
    expect(view.tick).toBe(game.tick())
    expect(view.viewHash).toBe(game.hashState())
    expect(view.phase).toBe(game.phase())
    expect(view.units).toEqual(authoritative.units)
    expect(view.buildings).toEqual(authoritative.buildings)
    expect(view.resources).toEqual(authoritative.resources)
    expect(view.players).toEqual(authoritative.players)
  })

  it('falls back to a full snapshot when its active cursor expires', () => {
    const game = boundedSession()
    const socket = new FakeSocket()
    const sender = new SnapshotSender(socket)
    sender.sendSnapshot(game, [])

    game.submit(
      0,
      Array.from({ length: 8 }, (_, index) => ({
        tick: index + 1,
        playerId: 0 as const,
        sequence: index + 1,
        intent: { type: 'MOVE' as const, payload: { unitIds: [1], x: 256 * (index + 1), y: 256 } }
      }))
    )
    for (let tick = 0; tick < 8; tick += 1) {
      game.advance()
    }

    sender.sendSnapshot(game, [])

    expect(message(socket)).toMatchObject({ type: 'snapshot', tick: 8 })
  })
})
