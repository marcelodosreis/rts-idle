import { isErrorMessage, isMoveMessage, isSnapshotMessage } from '@rts/protocol'
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

describe('protocol snapshot message', () => {
  const valid = {
    type: 'snapshot',
    tick: 7,
    units: [
      { id: 1, x: 256, y: 512, owner: 0 },
      { id: 2, x: 0, y: 0, owner: 1 }
    ]
  }

  it('accepts a valid snapshot message', () => {
    expect(isSnapshotMessage(valid)).toBe(true)
  })

  it('accepts a snapshot with no units', () => {
    expect(isSnapshotMessage({ type: 'snapshot', tick: 0, units: [] })).toBe(true)
  })

  it('rejects non-conforming payloads', () => {
    expect(isSnapshotMessage(null)).toBe(false)
    expect(isSnapshotMessage({ type: 'snapshot', tick: 1 })).toBe(false)
    expect(isSnapshotMessage({ type: 'snapshot', tick: 1.5, units: [] })).toBe(false)
    expect(isSnapshotMessage({ type: 'snapshot', tick: 1, units: '[]' })).toBe(false)
    expect(isSnapshotMessage({ type: 'snapshot', tick: 1, units: [null] })).toBe(false)
    expect(isSnapshotMessage({ type: 'snapshot', tick: 1, units: [{ id: 1, x: 1.5, y: 0, owner: 0 }] })).toBe(false)
    expect(isSnapshotMessage({ type: 'snapshot', tick: 1, units: [{ id: 1, x: 1, y: 0, owner: 4 }] })).toBe(false)
    expect(isSnapshotMessage({ type: 'error', tick: 1, units: [] })).toBe(false)
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
