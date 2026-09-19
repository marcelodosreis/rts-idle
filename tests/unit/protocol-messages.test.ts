import { isCommandMessage, isErrorMessage, isMoveMessage, isSnapshotMessage } from '@rts/protocol'
import { describe, expect, it } from 'vitest'

describe('protocol MOVE message', () => {
  it('accepts a valid MOVE message', () => {
    expect(isMoveMessage({ type: 'MOVE', unitIds: [1, 2], x: 100, y: 200 })).toBe(true)
  })

  it('accepts an empty unit list at the transport layer (the simulation rejects it)', () => {
    expect(isMoveMessage({ type: 'MOVE', unitIds: [], x: 0, y: 0 })).toBe(true)
  })

  it('rejects non-conforming payloads', () => {
    expect(isMoveMessage(null)).toBe(false)
    expect(isMoveMessage('MOVE')).toBe(false)
    expect(isMoveMessage({ type: 'ATTACK', unitIds: [1], x: 0, y: 0 })).toBe(false)
    expect(isMoveMessage({ type: 'MOVE', x: 0, y: 0 })).toBe(false)
    expect(isMoveMessage({ type: 'MOVE', unitIds: '1', x: 0, y: 0 })).toBe(false)
    expect(isMoveMessage({ type: 'MOVE', unitIds: [1.5], x: 0, y: 0 })).toBe(false)
    expect(isMoveMessage({ type: 'MOVE', unitIds: [1], x: 0.5, y: 0 })).toBe(false)
    expect(isMoveMessage({ type: 'MOVE', unitIds: [1], x: 0, y: '0' })).toBe(false)
  })
})

describe('protocol command message', () => {
  it('accepts every command intent', () => {
    const commands = [
      { type: 'command', intent: { type: 'MOVE', payload: { unitIds: [1, 2], x: 100, y: 200 } } },
      { type: 'command', intent: { type: 'STOP', payload: { unitIds: [1] } } },
      { type: 'command', intent: { type: 'HOLD', payload: { unitIds: [1] } } },
      { type: 'command', intent: { type: 'PATROL', payload: { unitIds: [1], x: 100, y: 200 } } },
      { type: 'command', intent: { type: 'ATTACK', payload: { unitIds: [1], targetId: 5 } } },
      { type: 'command', intent: { type: 'ATTACK_MOVE', payload: { unitIds: [1], x: 100, y: 200 } } },
      { type: 'command', intent: { type: 'SURRENDER', payload: {} } }
    ]
    for (const message of commands) {
      expect(isCommandMessage(message)).toBe(true)
    }
  })

  it('rejects non-conforming command payloads', () => {
    expect(isCommandMessage(null)).toBe(false)
    expect(isCommandMessage({ type: 'command' })).toBe(false)
    expect(isCommandMessage({ type: 'MOVE', unitIds: [1], x: 0, y: 0 })).toBe(false)
    expect(
      isCommandMessage({ type: 'command', intent: { type: 'MOVE', payload: { unitIds: [1], x: 0.5, y: 0 } } })
    ).toBe(false)
    expect(isCommandMessage({ type: 'command', intent: { type: 'MOVE', payload: { unitIds: '1', x: 0, y: 0 } } })).toBe(
      false
    )
    expect(
      isCommandMessage({ type: 'command', intent: { type: 'ATTACK', payload: { unitIds: [1], targetId: 2.5 } } })
    ).toBe(false)
    expect(isCommandMessage({ type: 'command', intent: { type: 'SURRENDER', payload: { unitIds: [1] } } })).toBe(false)
    expect(isCommandMessage({ type: 'command', intent: { type: 'FLY', payload: {} } })).toBe(false)
  })
})

describe('protocol snapshot message', () => {
  const valid = {
    type: 'snapshot',
    tick: 7,
    phase: 'RUNNING' as const,
    units: [
      { id: 1, x: 256, y: 512, owner: 0, kind: 'pawn', hp: 90, maxHp: 100, orderState: 'attacking' },
      { id: 2, x: 0, y: 0, owner: 1 }
    ],
    bases: [{ id: 3, x: 128, y: 256, owner: 0 }],
    mineralNodes: [{ id: 4, x: 768, y: 256, remaining: 3000 }],
    players: [
      { id: 0, defeated: false, gold: 0 },
      { id: 1, defeated: true, gold: 5 }
    ],
    events: [{ type: 'damageDealt', targetId: 1, amount: 10, targetHp: 90 }]
  }

  it('accepts a valid snapshot message', () => {
    expect(isSnapshotMessage(valid)).toBe(true)
  })

  it('accepts a finished snapshot', () => {
    expect(isSnapshotMessage({ ...valid, phase: 'FINISHED' })).toBe(true)
  })

  it('accepts a snapshot with no units', () => {
    expect(
      isSnapshotMessage({
        type: 'snapshot',
        tick: 0,
        phase: 'RUNNING',
        units: [],
        bases: [],
        mineralNodes: [],
        players: [],
        events: []
      })
    ).toBe(true)
  })

  it('accepts a unit with optional combat fields omitted', () => {
    expect(
      isSnapshotMessage({
        type: 'snapshot',
        tick: 0,
        phase: 'RUNNING',
        units: [{ id: 1, x: 0, y: 0, owner: 0 }],
        bases: [],
        mineralNodes: [],
        players: [],
        events: []
      })
    ).toBe(true)
  })

  it('validates authoritative economy presentation state', () => {
    const economy = {
      phase: 'gathering',
      cargoAmount: 3,
      cargoCapacity: 10,
      progressTicks: 12,
      progressMax: 20,
      nodeId: 4
    }
    expect(isSnapshotMessage({ ...valid, units: [{ ...valid.units[0], economy }] })).toBe(true)
    expect(
      isSnapshotMessage({ ...valid, units: [{ ...valid.units[0], economy: { ...economy, cargoAmount: 11 } }] })
    ).toBe(false)
    expect(
      isSnapshotMessage({ ...valid, units: [{ ...valid.units[0], economy: { ...economy, phase: 'teleporting' } }] })
    ).toBe(false)
    expect(
      isSnapshotMessage({ ...valid, units: [{ ...valid.units[0], economy: { ...economy, progressMax: 0 } }] })
    ).toBe(false)
  })

  it('rejects unknown kinds, order states, and phases', () => {
    expect(
      isSnapshotMessage({
        type: 'snapshot',
        tick: 1,
        phase: 'RUNNING',
        units: [{ id: 1, x: 0, y: 0, owner: 0, kind: 'zeppelin' }],
        bases: [],
        mineralNodes: [],
        players: [],
        events: []
      })
    ).toBe(false)
    expect(
      isSnapshotMessage({
        type: 'snapshot',
        tick: 1,
        phase: 'RUNNING',
        units: [{ id: 1, x: 0, y: 0, owner: 0, orderState: 'flying' }],
        bases: [],
        mineralNodes: [],
        players: [],
        events: []
      })
    ).toBe(false)
    expect(
      isSnapshotMessage({
        type: 'snapshot',
        tick: 1,
        phase: 'PAUSED',
        units: [],
        bases: [],
        mineralNodes: [],
        players: [],
        events: []
      })
    ).toBe(false)
  })

  it('requires and validates Base and Mineral Node projections', () => {
    const { bases: _bases, ...withoutBases } = valid
    const { mineralNodes: _mineralNodes, ...withoutMineralNodes } = valid
    expect(isSnapshotMessage(withoutBases)).toBe(false)
    expect(isSnapshotMessage(withoutMineralNodes)).toBe(false)
    expect(isSnapshotMessage({ ...valid, bases: [{ id: 3, x: 0, y: 0, owner: 4 }] })).toBe(false)
    expect(isSnapshotMessage({ ...valid, mineralNodes: [{ id: 4, x: 0, y: 0, remaining: -1 }] })).toBe(false)
  })

  it('rejects malformed players and events', () => {
    expect(
      isSnapshotMessage({ type: 'snapshot', tick: 1, phase: 'RUNNING', units: [], players: [null], events: [] })
    ).toBe(false)
    expect(
      isSnapshotMessage({
        type: 'snapshot',
        tick: 1,
        phase: 'RUNNING',
        units: [],
        players: [],
        events: [{ type: 'nope' }]
      })
    ).toBe(false)
  })

  it('rejects non-conforming payloads', () => {
    expect(isSnapshotMessage(null)).toBe(false)
    expect(isSnapshotMessage({ type: 'snapshot', tick: 1 })).toBe(false)
    expect(
      isSnapshotMessage({ type: 'snapshot', tick: 1.5, phase: 'RUNNING', units: [], players: [], events: [] })
    ).toBe(false)
    expect(
      isSnapshotMessage({ type: 'snapshot', tick: 1, phase: 'RUNNING', units: '[]', players: [], events: [] })
    ).toBe(false)
    expect(
      isSnapshotMessage({ type: 'snapshot', tick: 1, phase: 'RUNNING', units: [null], players: [], events: [] })
    ).toBe(false)
    expect(
      isSnapshotMessage({
        type: 'snapshot',
        tick: 1,
        phase: 'RUNNING',
        units: [{ id: 1, x: 1.5, y: 0, owner: 0 }],
        players: [],
        events: []
      })
    ).toBe(false)
    expect(
      isSnapshotMessage({
        type: 'snapshot',
        tick: 1,
        phase: 'RUNNING',
        units: [{ id: 1, x: 1, y: 0, owner: 4 }],
        players: [],
        events: []
      })
    ).toBe(false)
    expect(isSnapshotMessage({ type: 'error', tick: 1, phase: 'RUNNING', units: [], players: [], events: [] })).toBe(
      false
    )
  })
})

describe('protocol error message', () => {
  it('accepts a valid error message', () => {
    expect(isErrorMessage({ type: 'error', message: 'boom' })).toBe(true)
  })

  it('rejects non-conforming payloads', () => {
    expect(isErrorMessage(null)).toBe(false)
    expect(isErrorMessage({ type: 'error' })).toBe(false)
    expect(isErrorMessage({ type: 'error', message: 42 })).toBe(false)
    expect(isErrorMessage({ type: 'snapshot', message: 'x' })).toBe(false)
  })
})
